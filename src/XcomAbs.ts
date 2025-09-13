import { Jimp, JimpInstance } from "jimp"
import { SmartBuffer } from "smart-buffer";
import { Address, MAX_MULTI_INFO, ObjectID_Screen, ObjectType, PropertyID, PropertyID_Datalog, ServiceID } from "./constants";
import { Datapoint, MultiInfoRequest, MultiInfoResponse, Package } from "./protocol";


export abstract class XcomAbs {

    async getValue(parameter: Datapoint, dstAddr: Address, propertyID = PropertyID.UnsavedValue): Promise<any> {
        if (!(propertyID in PropertyID)) {
            throw new Error("invalid propertyID");
        }

        const request = Package.genPackage(
            ServiceID.PropertyRead,
            parameter.id,
            this.getObjectType(parameter.id),
            propertyID,
            Buffer.alloc(0),
            Address.Source,
            dstAddr
        );

        return this.sendPackage(request).then(p => 
            parameter.unpackValue(p.frame.service_data.property_data));
    }

    private getObjectType(id: number): ObjectType {
        /*
        // TODO proper objectType handling

        if QSPLevel exists => ObjectType.Parameter
        else ObjectType.Info
        */

        /*
        INFO ranges:

        XTender: 3000 - 3999
        BSP: 7000 - 7999
        Xcom-CAN BMS: 7000 - 7999
        VT: 11000 - 11999
        VS: 15000 - 15999
        */

        const isInfo = (3000 <= id && id < 4000)
            || (7000 <= id && id < 8000)
            || (11_000 <= id && id < 12_000)
            || (15_000 <= id && id < 16_000);
        
        return isInfo ? ObjectType.Info : ObjectType.Parameter;
    }

    async getMultiValue(parameters: MultiInfoRequest[]): Promise<MultiInfoResponse> {
        if (parameters.length > MAX_MULTI_INFO) {
            return Promise.reject(
                `MultiInfo max parameter count (${MAX_MULTI_INFO}) exceeded`);
        }

        // only ObjectType.Info allowed
        for (const mir of parameters) {
            if (this.getObjectType(mir.user_info_reference) != ObjectType.Info) {
                return Promise.reject("Requested ObjectType is not INFO");
            }
        }

        const data = MultiInfoRequest.bytesFromArray(parameters);
        const request = Package.genPackage(
            ServiceID.PropertyRead,
            0x1,
            ObjectType.MultiInfo,
            PropertyID.None,
            data,
            Address.Source,
            Address.Xcom232i
        );

        return this.sendPackage(request).then(p => {
            return MultiInfoResponse.fromBuffer(
                p.frame.service_data.property_data, parameters.length);
        });
    }


    async setValue(parameter: Datapoint, value: any, dstAddr: Address, propertyID = PropertyID.UnsavedValue) {
        if (!(propertyID in PropertyID)) {
            throw new Error("invalid propertyID");
        }

        const request: Package = Package.genPackage(
            ServiceID.PropertyWrite,
            parameter.id,
            ObjectType.Parameter,
            propertyID,
            parameter.packValue(value),
            Address.Source,
            dstAddr
        );

        await this.sendPackage(request);
    }


    async getScreen(command: ObjectID_Screen, colorinvert = false): Promise<JimpInstance> {
        const request: Package = Package.genPackage(
            ServiceID.PropertyRead,
            command,
            ObjectType.Screen,
            0x0 as PropertyID, // Full screen,
            Buffer.alloc(0),
            Address.Source,
            Address.Xcom232i
        );
        return this.sendPackage(request).then(
            p => this.decodeScreenData(p.frame.service_data.property_data, colorinvert));
    }

    private decodeScreenData(buf: Buffer, colorinvert: boolean): JimpInstance {
        // looking at the raw data in hex editor, it seems like
        // the data is not encoded the way it is explained in the documentation at all
        // instead they are simply sending the image encoded with 1bpp

        // resolution is usually 128x64
        const xRes = 128;
        const yRes = 64;

        const colorWhite = 0xFFFFFFFF;
        const colorBlack = 0x000000FF;

        const output: number[] = [];

        for (let i = 0; i < buf.length; i++) {
            // convert from 1bpp to 32bpp for Jimp
            const chunk = buf.readUint8(i);

            for (let x = 7; x >= 0; x--) {
                const bit = (chunk >> x) & 1;
                let color;

                if (colorinvert) {
                    color = bit ? colorWhite : colorBlack;
                }
                else {
                    color = bit ? colorBlack : colorWhite;
                }

                output.push(color);
            }
        }

        const image = Jimp.fromBitmap({
            height: yRes,
            width: xRes,
            data: output
        });

        if (image instanceof Jimp) {
            image.flip({vertical: true});
            return image;
        }
        else {
            throw new Error("Failed to convert data to image");
        }
    }

    private decodeScreenData_official(buf: Buffer): Buffer {
        // resolution is usually 128x64
        const xRes = 128;
        const yRes = 64;

        const output = new SmartBuffer();

        // data is packed into 16bit chunks
        for (let i = 0; i < buf.length; i = i+2) {
            const chunk = buf.readUint16BE(i);
            
            const test = buf.subarray(i, i+2);
            console.log(i, test.toString("hex"));

            if ((chunk >> 15) == 0) {
                // 15 pixels with 1bpp
                for (let y = 0; y < 15; y++) {
                    const bit = ((chunk >> y) & 1) == 1;
                    output.writeUInt8(bit ? 0xFF : 0x00);
                }
            }
            else {
                const bit = ((chunk >> 14) & 1) == 1 ? 0xFF : 0x00;
                const count = chunk & 0b0011111111111111;

                for (let c = 0; c < count; c++) {
                    output.writeUInt8(bit);
                }

            }

        }

        return output.toBuffer();
    }

    abstract sendPackage(pack: Package): Promise<Package>;
}
