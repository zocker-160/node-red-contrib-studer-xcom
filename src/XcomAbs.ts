
import { Address, ObjectType, PropertyID, ServiceID } from "./constants";
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
        // only ObjectType.Info allowed
        for (const mir of parameters) {
            if (this.getObjectType(mir.user_info_reference) != ObjectType.Info) {
                return Promise.reject(
                    new Error("Requested ObjectType is not INFO"));
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

        const response = await this.sendPackage(request);
        if (response.isError()) {
            throw new Error(`write request failed: ${response.getError()}`);
        }
    }

    abstract sendPackage(pack: Package): Promise<Package>;
}
