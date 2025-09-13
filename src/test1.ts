import { writeFile, writeFileSync } from "fs";
import { Address, AggregationType, DataType, ObjectID_Screen, ObjectType, PropertyID, ServiceID } from "./constants";
import { Datapoint, MultiInfoRequest, MultiInfoResponse, Package } from "./protocol";
import { XcomRS232 } from "./XcomRS232";


console.log("Studer Xcom Test");


function debug1() {
    const param = new Datapoint(11043, DataType.Float, "PV_POWER", "W");
    const request = Package.genPackage(
        ServiceID.PropertyRead,
        param.id,
        ObjectType.Info,
        PropertyID.UnsavedValue,
        Buffer.alloc(0),
        Address.Source,
        Address.AllXT
    );

    const ist = request.getBytes();
    const soll = Buffer.from("aa0001000000640000000a006e6b00010100232b00000d005cca", "hex");

    console.log(ist);
    console.log(soll);
    console.log("-----------------------");

    const param2 = new Datapoint(15017, DataType.Float, "VS_PV_PROD", "kWh");
    const request2 = Package.genPackage(
        ServiceID.PropertyRead,
        param2.id,
        ObjectType.Info,
        PropertyID.UnsavedValue,
        Buffer.alloc(0),
        Address.Source,
        701 as Address
    );

    const ist2 = request2.getBytes();
    const soll2 = Buffer.from("aa0001000000bd0200000a00c98b00010100a93a00000d00f139", "hex");

    console.log(ist2);
    console.log(soll2);
    console.log("-------------------");

    const PACK1 = Buffer.from("aae6bd020000010000000e00b36d02010100a93a00000d0000801141c5fc", "hex");
    const p1 = Package.fromBuffer(PACK1);
    console.log(p1);
    console.log(param2.unpackValue(p1.frame.service_data.property_data))


    const PACK2 = Buffer.from("aa1f010001000e692601402325004300fb3daf0de1", "hex");
    const p2 = Package.fromBuffer(PACK2);
    console.log(p2);
}

function debug2() {
    const xcom = new XcomRS232("/dev/ttyXcom232", 115200);

    //const param = new Datapoint(15017, DataType.Float, "VS_PV_PROD", "kWh");
    const param = new Datapoint(3081, DataType.Float, "AC_ENERGY_IN_CURR_DAY", "kWh");

    xcom.getValue(param, Address.AllXT)
        .then(p => console.log(p))
        .finally(() => xcom.close());
}

function debugMultiInfo() {
    const xcom = new XcomRS232("/dev/ttyXcom232", 115200, true);

    const multiinfo = [
        new MultiInfoRequest(3081, AggregationType.Master),
        new MultiInfoRequest(3083, AggregationType.Master),
        new MultiInfoRequest(11011, AggregationType.Master),
        new MultiInfoRequest(11009, AggregationType.Master),
        new MultiInfoRequest(11007, AggregationType.Master)
    ];

    const data = MultiInfoRequest.bytesFromArray(multiinfo);
    const request = Package.genPackage(
        ServiceID.PropertyRead,
        0x1,
        ObjectType.MultiInfo,
        PropertyID.None,
        data,
        Address.Source,
        Address.Xcom232i
    );
    //console.log("request:", request.getBytes().toString("hex"));

    xcom.sendPackage(request)
        .then(p => {
            //console.log("response", p.getBytes().toString("hex"));

            const mir = MultiInfoResponse.fromBuffer(
                p.frame.service_data.property_data, multiinfo.length);

            console.log("data", mir);
        })
        .finally(() => xcom.close());

    /*
    xcom.getMultiValue(multiinfo)
        .then(p => console.log(p))
        .finally(() => xcom.close());
    */
}

function debugScreen() {
    const xcom = new XcomRS232("/dev/ttyXcom232", 115200, true);

    xcom.getScreen(ObjectID_Screen.Refresh)
        .then(p => {
            console.log(p.getBuffer("image/png"));
            //p.write("image.png");
        })
        .finally(() => xcom.close());
}

debugScreen();
