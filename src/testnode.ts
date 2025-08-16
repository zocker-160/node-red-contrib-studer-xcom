import { NodeAPI, NodeDef } from "node-red";


interface StuderTestConfig extends NodeDef {
    serial: string
}


export = function (RED: NodeAPI) {
    RED.nodes.registerType("studer-xcomtest", function (config: StuderTestConfig) {
        RED.nodes.createNode(this, config);

        this.on("input", (msg, send, done) => {

            const serial = RED.nodes.getNode(config.serial);
            console.log(msg, config, serial);

            this.error("LOL? v2", msg);
        });

    });

}
