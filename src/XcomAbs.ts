
import { Address, ObjectType, PropertyID, ServiceID } from "./constants";
import { Datapoint, Package } from "./protocol";


export abstract class XcomAbs {

    // TODO getMultiValue / object_type multi info
    // see: https://github.com/ankohanse/aioxcom/blob/17c64937f7f7cc6a4c86b91bcf71f1c47aca402a/src/aioxcom/xcom_api.py#L190

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

        return this.sendPackage(request)
            .then(p => 
                parameter.unpackValue(p.frame.service_data.property_data));
    }

    private getObjectType(id: number): ObjectType {
        // TODO proper objectType handling
        // see: https://github.com/ankohanse/aioxcom/blob/17c64937f7f7cc6a4c86b91bcf71f1c47aca402a/src/aioxcom/xcom_datapoints.py#L87
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
