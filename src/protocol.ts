
import assert from "node:assert/strict";
import { SmartBuffer } from "smart-buffer";
import { Address, AggregationType, DataType, ErrorCode, FrameFlags, MAX_MULTI_INFO, MSG_MAX_LENGTH, MultiInfoFlags, ObjectType, PropertyID, ServiceFlags, ServiceID } from "./constants";

const iconf = require("iconv-lite");


class Service {
    object_type: ObjectType
    object_id: number
    property_id: PropertyID
    property_data: Buffer
    
    static fromBuffer(data: SmartBuffer): Service {
        const oType = data.readUInt16LE();
        const oId = data.readUInt32LE();
        const pId = data.readUInt16LE();
        const pData = data.readBuffer();

        return new Service(oType, oId, pId, pData);
    }

    constructor(object_type: ObjectType, object_id: number,
                property_id: PropertyID, property_data: Buffer) {

        this.object_type = object_type;
        this.object_id = object_id;
        this.property_id = property_id;
        this.property_data = property_data;
    }

    toBuffer(data: SmartBuffer) {
        data.writeUInt16LE(this.object_type);
        data.writeUInt32LE(this.object_id);
        data.writeUInt16LE(this.property_id);
        data.writeBuffer(this.property_data);
    }

    length(): number {
        return 2*2 + 4 + this.property_data.length;
    }
}


class Frame {
    service_flags: ServiceFlags
    service_id: ServiceID
    service_data: Service

    static fromBuffer(data: Buffer): Frame {
        return this.fromSmartBuffer(SmartBuffer.fromBuffer(data));
    }

    private static fromSmartBuffer(data: SmartBuffer): Frame {
        const flags = data.readUInt8();
        const id = data.readUInt8();
        const d = Service.fromBuffer(data);

        return new Frame(id, d, flags);
    }

    constructor(service_id: ServiceID, service_data: Service, 
                service_flags: ServiceFlags = ServiceFlags.None) {

        this.service_flags = service_flags;
        this.service_id = service_id;
        this.service_data = service_data;
    }

    getBytes(): Buffer {
        const buf = new SmartBuffer();
        this.writeBytes(buf);
        return buf.toBuffer();
    }

    private writeBytes(data: SmartBuffer) {
        data.writeUInt8(this.service_flags);
        data.writeUInt8(this.service_id);
        this.service_data.toBuffer(data);
    }

    length(): number {
        return 2*1 + this.service_data.length();
    }
}


class Header {
    frame_flags: FrameFlags
    src_addr: Address
    dst_addr: Address
    data_length: number

    static headerLength: number = 2*4 + 2 + 1

    static fromBuffer(data: Buffer) {
        return this.fromSmartBuffer(SmartBuffer.fromBuffer(data));
    }

    private static fromSmartBuffer(data: SmartBuffer) {
        const flags = data.readUInt8();
        const src = data.readUInt32LE();
        const dst = data.readUInt32LE();
        const len = data.readUInt16LE();

        return new Header(src, dst, len, flags);
    }

    constructor(src: Address, dst: Address, length: number, 
                frame_flags: FrameFlags = FrameFlags.None) {

        //assert(length <= MSG_MAX_LENGTH);

        this.frame_flags = frame_flags;
        this.src_addr = src;
        this.dst_addr = dst;
        this.data_length = length;
    }

    getBytes(): Buffer {
        const buf = new SmartBuffer();
        this.writeBytes(buf);
        return buf.toBuffer();
    }

    private writeBytes(data: SmartBuffer) {
        data.writeUInt8(this.frame_flags);
        data.writeUInt32LE(this.src_addr);
        data.writeUInt32LE(this.dst_addr);
        data.writeUInt16LE(this.data_length);
    }
}


export class Package {

    static startByte = 0xAA
    header: Header
    frame: Frame


    static fromBuffer(data: Buffer): Package {
        return this.fromSmartBuffer(SmartBuffer.fromBuffer(data));
    }

    private static fromSmartBuffer(data: SmartBuffer): Package {
        assert(seekPackageStart(data), "package start byte not found");

        const h_raw = data.readBuffer(Header.headerLength);
        assert(checksum(h_raw).equals(data.readBuffer(2)), "invalid header checksum");
        const header = Header.fromBuffer(h_raw);

        const f_raw = data.readBuffer(header.data_length);
        assert(checksum(f_raw).equals(data.readBuffer(2)), "invalid frame checksum");
        const frame = Frame.fromBuffer(f_raw);

        return new Package(header, frame);
    }

    static genPackage(
        service_id: ServiceID,
        object_id: number,
        object_type: ObjectType,
        property_id: PropertyID,
        property_data: Buffer,
        src_addr: Address,
        dst_addr: Address): Package {

        const frame = new Frame(
            service_id,
            new Service(object_type, object_id, property_id, property_data)
        );
        return new Package(
            new Header(src_addr, dst_addr, frame.length()),
            frame
        );
    }

    constructor(header: Header, data: Frame) {
        this.header = header;
        this.frame = data;
    }

    getBytes(): Buffer {
        const buf = new SmartBuffer();
        this.writeBytes(buf);
        return buf.toBuffer();
    }

    private writeBytes(data: SmartBuffer) {
        data.writeUInt8(Package.startByte);

        const header = this.header.getBytes();
        data.writeBuffer(header);
        data.writeBuffer(checksum(header));

        const frame = this.frame.getBytes();
        data.writeBuffer(frame);
        data.writeBuffer(checksum(frame));
    }

    isResponse(): boolean {
        return (this.frame.service_flags & ServiceFlags.Response) === ServiceFlags.Response;
    }

    isError(): boolean {
        return (this.frame.service_flags & ServiceFlags.Error) === ServiceFlags.Error;
    }

    getError(): string {
        if (this.isError() == false) {
            return "NO ERROR";
        }

        const data = this.frame.service_data.property_data;
        assert.equal(data.length, 2);

        const err = data.readUint16LE(0);
        if (err in ErrorCode) {
            return ErrorCode[err];
        } else {
            return "UNKNOWN ERROR";
        }
    }
}

function seekPackageStart(data: SmartBuffer): boolean {
    let d = 0;
    while (d = data.readUInt8()) {
        if (d == Package.startByte) {
            return true;
        }
    }

    return false;
}

function checksum(data: Buffer): Buffer {
    let A = 0xFF
    let B = 0x00

    for (const d of data) {
        A = (A + d) % 0x100;
        B = (A + B) % 0x100;
    }

    const buf = Buffer.alloc(2);
    buf.writeUint8(A, 0);
    buf.writeUint8(B, 1);

    return buf;
}


export class Datapoint {
    id: number
    name?: string
    type: DataType
    unit?: string

    constructor(id: number, type: DataType, name?: string, unit?: string) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.unit = unit;
    }

    equals(point: Datapoint): boolean {
        return this.id === point.id
            && this.type === point.type;
    }

    unpackValue(value: Buffer): number | boolean | string | Buffer {
        switch (this.type) {
            case DataType.Bool:
                return value.readUint8() > 0;
            case DataType.SInt:
                return value.readInt32LE();
            case DataType.Float:
                return value.readFloatLE();
            case DataType.EnumShort:
                return value.readUint16LE();
            case DataType.EnumLong:
                return value.readUint32LE();
            case DataType.String:
                return iconf.decode(value, "ISO-8859-15");
            case DataType.Bytes:
                return value;
            case DataType.Error:
                const v = value.readUint16LE();
                if (v in ErrorCode) {
                    return ErrorCode[v];
                } else {
                    return v;
                }

            default:
                throw new Error("unknown datatype");
        }
    }

    packValue(value: any): Buffer {
        const buff = new SmartBuffer();
        switch (this.type) {
            case DataType.Bool:
                return buff.writeUInt8(value ? 1 : 0).toBuffer();
            case DataType.SInt:
                return buff.writeInt32LE(value).toBuffer();
            case DataType.Float:
                return buff.writeFloatLE(value).toBuffer();
            case DataType.EnumShort:
                return buff.writeUInt16LE(value).toBuffer();
            case DataType.EnumLong:
                return buff.writeUInt32LE(value).toBuffer();
            case DataType.String:
                return iconf.encode(value, "ISO-8859-15");
            case DataType.Bytes:
                return value as Buffer;
            
            default:
                throw new Error("unknown datatype");
        }
    }
}


export class MultiInfoRequest {
    user_info_reference: number // basically Datapoint ID / object_id
    aggregation_type: AggregationType

    static byteLength = 3;

    static bytesFromArray(requests: MultiInfoRequest[]): Buffer {
        const count = requests.length;
        const expectedLength = count * MultiInfoRequest.byteLength;

        assert(count > 0, "MultiInfo request is empty");
        assert(count <= MAX_MULTI_INFO, "MultiInfo request has too many entries");

        const buf = Buffer.concat(requests.map(req => req.getBytes()));
        assert.equal(buf.length, expectedLength, "unexpected MultiInfo size");

        return buf;
    }

    static fromBuffer(data: Buffer): MultiInfoRequest {
        const uInfo = data.readUint16LE(0);
        const aType = data.readUint8(2);

        return new MultiInfoRequest(uInfo, aType);
    }

    constructor(parameter_id: number, aggregation_type: AggregationType) {
        this.user_info_reference = parameter_id;
        this.aggregation_type = aggregation_type;
    }

    getBytes(): Buffer {
        const buf = Buffer.alloc(MultiInfoRequest.byteLength);
        buf.writeUint16LE(this.user_info_reference, 0);
        buf.writeUint8(this.aggregation_type, 2);
        return buf;
    }
}


export class MultiInfoResponse {
    flags: MultiInfoFlags
    datetime: number // TODO
    entries: MultiInfoEntry[];

    static fromBuffer(data: Buffer, numEntries: number): MultiInfoResponse {
        const buf = SmartBuffer.fromBuffer(data);

        const flags = buf.readUInt32LE();
        const datetime = buf.readUInt32LE();
        const entries: MultiInfoEntry[] = [];

        for (let i = 0; i < numEntries; i++) {
            const entry = MultiInfoEntry.fromSmartBuffer(buf);
            entries.push(entry);
        }

        return new MultiInfoResponse(flags, datetime, entries);
    }

    constructor(flags: MultiInfoFlags, datetime: number, entries: MultiInfoEntry[]) {
        this.flags = flags;
        this.datetime = datetime;
        this.entries = entries;
    }

    getBytes(): Buffer {
        const buf = new SmartBuffer();

        buf.writeUInt32LE(this.flags);
        buf.writeUInt32LE(this.datetime);
        this.entries.map(entry => entry.toSmartBuffer(buf));

        return buf.toBuffer();
    }
}

class MultiInfoEntry {
    user_info_reference: number // basically Datapoint ID / object_id
    aggregation_type: AggregationType
    value: number

    static byteLength = 3 + 4;

    static fromSmartBuffer(data: SmartBuffer): MultiInfoEntry {
        const uInfo = data.readUInt16LE();
        const aType = data.readUInt8();
        const value = data.readFloatLE();

        return new MultiInfoEntry(uInfo, aType, value);
    }

    constructor(parameter_id: number, aggregation_type: AggregationType, value: number) {
        this.user_info_reference = parameter_id;
        this.aggregation_type = aggregation_type;
        this.value = value;
    }

    toSmartBuffer(buf: SmartBuffer) {
        buf.writeUInt16LE(this.user_info_reference);
        buf.writeUInt8(this.aggregation_type);
        buf.writeFloatLE(this.value);
    }
}
