import { Node, NodeAPI, NodeDef } from "node-red";
import { Datapoint } from "./protocol";
import { Address, DataType, PropertyID } from "./constants";
import { XcomRS232 } from "./XcomRS232";


interface StuderConfig extends NodeDef {
    serial: string
    parid: string
    partype: string
    paraddr: string
    parpid: string
}

interface SerialPortNode extends Node {
    serialport: string
    serialbaud: number
    enabled: boolean
}


export = function (RED: NodeAPI) {
    RED.nodes.registerType("studer-xcomrs232-write", function (config: StuderConfig) {
        RED.nodes.createNode(this, config);

        this.on("input", (msg, send, done) => {
            if (!msg || msg.payload == undefined || msg.payload == null) {
                return;
            }

            const serial = RED.nodes.getNode(config.serial) as SerialPortNode;
            if (!serial) {
                done(new Error("serial port config node not available"));
                return null;
            }

            const id = parseInt(config.parid);
            const type = parseInt(config.partype) as DataType
            const addr = parseInt(config.paraddr) as Address
            const propId = parseInt(config.parpid) as PropertyID

            const dp = new Datapoint(id, type);

            try {
                const xcom = new XcomRS232(serial.serialport, serial.serialbaud);

                this.status({
                    fill: "yellow",
                    shape: "dot",
                    text: "writing"
                });

                xcom.setValue(dp, msg.payload, addr, propId)
                    .catch(err => done(err))
                    .finally(() => {
                        this.status({});
                        xcom.close();
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
