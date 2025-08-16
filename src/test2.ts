import { Address, DataType, PropertyID } from "./constants";
import { Datapoint } from "./protocol";
import { XcomRS232 } from "./XcomRS232";


const serial = "/dev/ttyXcom232";
const baudrate = 115200;

const pvPower = new Datapoint(11043, DataType.Float, "PV_POWER", "W");
const pvProd = new Datapoint(11025, DataType.Float, "PV_SUN_HOURS_CURR_DAY", "h");

const xcom = new XcomRS232(serial, baudrate, true);


xcom.getValue(pvPower, Address.AllXT, PropertyID.UnsavedValue)
    .then(value => {
        console.log(pvPower.name, value * 1000);
        return xcom.getValue(pvProd, Address.AllXT, PropertyID.UnsavedValue)
    })
    .then(value => console.log(pvProd.name, value))

    .catch(err => console.error(err))
    .finally(() => {
        console.log("xcom close");
        xcom.close();
    });
