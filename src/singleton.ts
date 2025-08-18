
import EventEmitter from "events"
import { Node } from "node-red"


export interface SerialPortNode extends Node {
    serialport: string
    serialbaud: number
    enabled: boolean

    singleton: SerialSingleton
}


export class SerialSingleton {
    inUse: boolean
    event: EventEmitter

    constructor() {
        this.inUse = false;
        this.event = new EventEmitter();

    }
}
