import { DelimiterParser, SerialPort } from "serialport";
import { XcomAbs } from "./XcomAbs";
import { Package } from "./protocol";
import { once } from "events";


//const SERIAL_TERMINATOR = "\r\n";
const SERIAL_TERMINATOR = Buffer.from([0x0D, 0x0A]);

export class XcomRS232 extends XcomAbs {
    debugMode: boolean

    serialPort: SerialPort
    parser: DelimiterParser

    constructor(serialDevice: string, baudRate: number, debugMode = false) {
        super();
        this.serialPort = new SerialPort({
            path: serialDevice,
            baudRate: baudRate,
            autoOpen: true,
        });

        this.parser = this.serialPort.pipe(new DelimiterParser({
            delimiter: SERIAL_TERMINATOR,
            includeDelimiter: false
        }));

        this.debugMode = debugMode;
    }

    close() {
        this.serialPort.close();
    }

    async sendPackage(pack: Package): Promise<Package> {
        const data = Buffer.concat([pack.getBytes(), SERIAL_TERMINATOR]);
        if (this.debugMode) console.log("->>", data);

        return this.writeData(data).then(() => this.getNextPackage());
    }

    private async writeData(data: Buffer): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.serialPort.write(data);
                this.serialPort.drain(() => resolve());
            }
            catch (error) {
                reject(error);
            }
        });
    }

    private async getNextPackage(): Promise<Package> {
        if (this.debugMode) console.log("waiting for reponse");

        const [buffer] = await once(this.parser, "data");
        if (this.debugMode) console.log("<<-", buffer);    

        try {
            const result = Package.fromBuffer(buffer);
            if (this.debugMode) console.log(result);

            if (result.isError()) {
                return Promise.reject(new Error(result.getError()));
            }

            return Promise.resolve(result);

        } catch (error) {
            return Promise.reject(error);
        }
    }
}
