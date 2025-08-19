import { Node, NodeAPI, NodeDef } from "node-red";
import { Datapoint } from "./protocol";
import { Address, DataType, PropertyID } from "./constants";
import { XcomRS232 } from "./XcomRS232";
import { SerialPortNode, SerialSingleton } from "./singleton";


interface StuderConfig extends NodeDef {
    serial: string
    parid: string
    partype: string
    paraddr: string
    parpid: string
}


export = function (RED: NodeAPI) {
    RED.nodes.registerType("studer-xcomrs232-write", function (config: StuderConfig) {
        RED.nodes.createNode(this, config);

        const serial = RED.nodes.getNode(config.serial) as SerialPortNode;
        if (!serial) {
            return null;
        }
        if (!serial.singleton) {
            serial.singleton = new SerialSingleton();
        }

        this.on("input", (msg, send, done) => {
            if (!msg || msg.payload == undefined || msg.payload == null) {
                return;
            }

            if (serial.singleton.inUse) {
                this.status({
                    fill: "yellow",
                    shape: "ring",
                    text: "waiting"
                });

                serial.singleton.event.once("done", () => this.receive(msg));
                return;
            }
            else {
                serial.singleton.inUse = true;
            }


            const id = parseInt(config.parid);
            const type = parseInt(config.partype) as DataType
            const addr = parseInt(config.paraddr) as Address
            const propId = parseInt(config.parpid) as PropertyID

            const dp = new Datapoint(id, type);

            try {
                const xcom = new XcomRS232(serial.serialport, serial.serialbaud);

                this.status({
                    fill: "red",
                    shape: "dot",
                    text: "writing"
                });

                xcom.setValue(dp, msg.payload, addr, propId)
                    .catch(err => done(err))
                    .finally(() => {
                        this.status({});
                        xcom.close();

                        serial.singleton.inUse = false;
                        serial.singleton.event.emit("done");

                        done();
                    });

            }
            catch (error) {
                if (error instanceof Error) {
                    done(error);
                }
                else {
                    done(new Error(String(error)));
                }
            }

        });
    });
}
