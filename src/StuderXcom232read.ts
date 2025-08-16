import { Node, NodeAPI, NodeDef } from "node-red";
import { Datapoint, MultiInfoRequest } from "./protocol";
import { Address, AggregationType, DataType, PropertyID } from "./constants";
import { XcomRS232 } from "./XcomRS232";


interface StuderConfig extends NodeDef {
    serial: string
    multiinfo?: boolean
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

            const paramRequest = (xcom: XcomRS232) => {
                config.entries.reduce(async (prev, curr) => {
                    await prev;

                    const dp = new Datapoint(
                        curr.id,
                        curr.type as DataType,
                        curr.name
                    );

                    this.status({
                        fill: "blue",
                        shape: "dot",
                        text: curr.name
                    });

                    const value = await xcom.getValue(dp, curr.dstAddr as Address);
                    payload[curr.name] = value;

                }, Promise.resolve())
                .catch(err => done(err))
                .finally(() => {
                    this.status({});
                    xcom.close();

                    msg.payload = payload;
                    send(msg);
                    done();
                });
            };

            const multiRequest = (xcom: XcomRS232) => {
                const multiinfo = config.entries.map(e => 
                    // TODO Aggregation type should be changable from UI
                    new MultiInfoRequest(e.id, AggregationType.Master));

                const payload: any = {};

                this.status({
                    fill: "blue",
                    shape: "dot",
                    text: "MultiInfo Request"
                });

                xcom.getMultiValue(multiinfo)
                    .then(mir => {
                        mir.entries.forEach((e, i) => {
                            const name = config.entries[i].name;
                            payload[name] = e.value;
                        });
                    })
                    .catch(err => done(err))
                    .finally(() => {
                        this.status({});
                        xcom.close();

                        msg.payload = payload;
                        send(msg);
                        done();
                    });
            };

            try {
                const xcom = new XcomRS232(serial.serialport, serial.serialbaud);

                if (config.multiinfo) {
                    multiRequest(xcom);
                }
                else {
                    paramRequest(xcom);
                }

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
