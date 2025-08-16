

// from Studer documentation
export const MSG_MAX_LENGTH = 256;
export const MAX_MULTI_INFO = 76;

export const enum DataType {
    Bool = 1,
    SInt = 2,      // sint32
    Float = 3,
    EnumShort = 4, // uint16
    EnumLong = 5,  // uint32
    String = 6,    // ISO-8859-15
    Bytes = 7,
    Error = 8,     // 16bit error code
}

export const enum Address {
    Broadcast = 0,
    Source = 1,
    AllXT = 100,
    AllVarioTrack = 300,
    Xcom232i = 501,
    AllBSP = 600,
    BSP = 601,
    AllVarioString = 700,
}


export const enum ServiceID {
    PropertyRead = 0x01,
    PropertyWrite = 0x02,
}

export const enum ServiceFlags {
    None = 0,
    Error = 1,
    Respone = 1 << 1,
}

export const enum FrameFlags {
    None = 0,
    MessagePending = 1 << 0,
    RestartReset = 1 << 1,
    SDCard = 1 << 2,
    SDCardFull = 1 << 3,
    DataloggerFilePresent = 1 << 4,
    DataloggerSupported = 1 << 5,
}

export const enum ObjectType {
    Info = 0x01,
    Parameter = 0x02,
    Message = 0x03,
    GUID = 0x04,
    Screen = 0x100,
    
    MultiInfo = 0x0A,
    
    DatalogField = 0x05,
    DatalogTransfer = 0x0101, // content of "CSVFILES/LOG"
}

export enum ObjectID_Screen {
    Refresh = 0x00,
    Down = 0x10,
    Esc = 0x20,
    Set = 0x40,
    Up = 0x80,
}

export enum PropertyID {
    None = 0x01,
    Value = 0x05,
    Min = 0x06,
    Max = 0x07,
    Level = 0x08,
    UnsavedValue = 0x0D,
}

export const enum PropertyID_Datalog {
    Invalid = 0x00,
    SD_Start = 0x21,
    SD_Datablock = 0x22,
    SD_Ack_Continue = 0x23,
    SD_Nack_Retry = 0x24,
    SD_Abort = 0x25,
    SD_Finish = 0x26,
}

export const enum AggregationType {
    Master = 0x00, // read only value of master device
    // 0x01 - 0x0F: read only value of device with uid 0x01 - 0x0F

    Average = 0xFD, // average value for all devices of same type
    Sum = 0xFE, // sum of values of all devices of same type
}

export const enum MultiInfoFlags {
    Xcom_GSM = 1 << 4, // Xcom-LAN if 0
    XT_present = 1 << 5,
    BSP_present = 1 << 6,
    VT_present = 1 << 7,
    VS_present = 1 << 8,
}

export const enum QSPLevel {
    ViewOnly = 0x00,
    Basic = 0x10,
    Expert = 0x20,
    Installer = 0x30,
    QSP = 0x40,
}

// 11016
export const enum OperatingMode {
    Night = 0,
    Startup = 1,
    Charger = 3,
    Security = 5,
    Off = 6,
    Charge = 8,
    ChargeV = 9,
    ChargeI = 10,
    ChargeT = 11,
}

export function isOperatingModeCharging(mode: OperatingMode): boolean { 
    return mode == OperatingMode.Charge
            || mode == OperatingMode.ChargeV
            || mode == OperatingMode.ChargeI
            || mode == OperatingMode.ChargeT;
}


export const enum BatteryCyclePhase {
    Bulk = 0,
    Absorpt = 1,
    Equalize = 2,
    Floating = 3,
    R_Float = 6,
    PER_ABS = 7,
}

export enum ErrorCode {
    INVALID_FRAME = 0x01,
    DEVICE_NOT_FOUND = 0x02,
    RESPONSE_TIMEOUT = 0x03,
    SERVICE_NOT_SUPPORTED = 0x11,
    INVALID_SERVICE_ARGUMENT = 0x12,
    SCOM_ERROR_GATEWAY_BUSY = 0x13,
    TYPE_NOT_SUPPORTED = 0x21,
    OBJECT_ID_NOT_FOUND = 0x22,
    PROPERTY_NOT_SUPPORTED = 0x23,
    INVALID_DATA_LENGTH = 0x24,
    PROPERTY_IS_READ_ONLY = 0x25,
    INVALID_DATA = 0x26,
    DATA_TOO_SMALL = 0x27,
    DATA_TOO_BIG = 0x28,
    WRITE_PROPERTY_FAILED = 0x29,
    READ_PROPERTY_FAILED = 0x2A,
    ACCESS_DENIED = 0x2B,
    SCOM_ERROR_OBJECT_NOT_SUPPORTED = 0x2C,
    SCOM_ERROR_MULTICAST_READ_NOT_SUPPORTED = 0x2D,
    OBJECT_PROPERTY_INVALID = 0x2E,
    FILE_OR_DIR_NOT_PRESENT = 0x2F,
    FILE_CORRUPTED = 0x30,
    INVALID_SHELL_ARG = 0x81,
}
