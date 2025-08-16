import { Node, NodeAPI, NodeDef } from "node-red";
import { Datapoint } from "./protocol";
import { Address, DataType, PropertyID } from "./constants";
import { XcomRS232 } from "./XcomRS232";


interface StuderConfig extends NodeDef {
    serial: string
    entries: Entry[]
}

interface Entry {
    id: number
    type: number
    dstAddr: number
    name: string
    pid: number
}


interface SerialPortNode extends Node {
    serialport: string
    serialbaud: number
    enabled: boolean
}


export = function (RED: NodeAPI) {
    RED.nodes.registerType("studer-xcomrs232", function (config: StuderConfig) {
        RED.nodes.createNode(this, config);

        this.on("input", (msg, send, done) => {
            const serial = RED.nodes.getNode(config.serial) as SerialPortNode;
            if (!serial) {
                done(new Error("serial port config node not available"));
                return null;
            }

            const payload: any = {};

            try {
                const xcom = new XcomRS232(serial.serialport, serial.serialbaud);

                config.entries.reduce((prev, curr) => {
                    return prev.then(() => {
                        const dp = new Datapoint(
                            curr.id, 
                            curr.type as DataType,
                            curr.name
                        );

                        this.status({
                            fill: "blue",
                            shape: "dot",
                            text: dp.name
                        });

                        return xcom.getValue(
                            dp, curr.dstAddr as Address, curr.pid as PropertyID)
                            .then(value => payload[curr.name] = value);
                    })
                }, Promise.resolve())
                .catch(err => done(err))
                .finally(() => {
                    this.status({});
                    xcom.close();

                    msg.payload = payload;
                    send(msg);
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
