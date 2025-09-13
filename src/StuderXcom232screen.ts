import { NodeAPI, NodeDef } from "node-red";
import { SerialPortNode, SerialSingleton } from "./singleton";
import { ObjectID_Screen } from "./constants";
import { XcomRS232 } from "./XcomRS232";


interface StuderConfig extends NodeDef {
    serial: string
}


export = function (RED: NodeAPI) {
    RED.nodes.registerType("studer-xcomrs232-screen", function (config: StuderConfig) {
        RED.nodes.createNode(this, config);

        const serial = RED.nodes.getNode(config.serial) as SerialPortNode;
        if (!serial) {
            return null;
        }
        if (!serial.singleton) {
            serial.singleton = new SerialSingleton();
        }

        this.on("input", (msg, send, done) => {
            let val = ObjectID_Screen.Refresh;

            switch (msg.payload) {
            case "OK":
                val = ObjectID_Screen.Set
                break;
            case "ESC":
                val = ObjectID_Screen.Esc;
                break;
            case "UP":
                val = ObjectID_Screen.Up;
                break;
            case "DOWN":
                val = ObjectID_Screen.Down;
                break;
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

            try {
                const xcom = new XcomRS232(serial.serialport, serial.serialbaud);

                this.status({
                    fill: "blue",
                    shape: "dot",
                    text: "requesting"
                });

                const MIME = "image/png";

                xcom.getScreen(val)
                    .then(img => img.getBuffer(MIME))
                    .then(img => {
                        msg.mime = MIME;
                        msg.payload = img;
                        send(msg);
                        done();
                    })
                    .catch(err => done(err))
                    .finally(() => {
                        this.status({});
                        xcom.close();

                        serial.singleton.inUse = false;
                        serial.singleton.event.emit("done");
                    })
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
