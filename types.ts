
export type Meta = {
    hideBody?: boolean;
    hideHeaders?: boolean;
    hideRequest?: boolean;
    hideResponse?: boolean;
}

export interface _Request extends Request {
    bodyRaw?: BodyInit | null ;
    bodyExtracted?: unknown;
}

export interface _Response extends Response {
    bodyRaw?: BodyInit | null ;
    bodyExtracted?: unknown;
}

export type BodyExtracted = { body: unknown; contentType: string }
