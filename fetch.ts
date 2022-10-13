import { type Args, parse } from "https://deno.land/std@0.158.0/flags/mod.ts";
import * as colors from "https://deno.land/std@0.158.0/fmt/colors.ts";
import { readAll } from "https://deno.land/std@0.159.0/streams/mod.ts";
import { getImageStrings } from "https://deno.land/x/terminal_images@3.0.0/mod.ts";
import { mimesToBlob, mimesToArrayBuffer, mimesToJSON, mimesToText, mimesToFormData } from "./mimes.ts";
import { assertEquals, assertObjectMatch } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { extension } from "https://deno.land/std@0.158.0/media_types/mod.ts?source=cli";

import type { _Request, Meta, _Response, BodyExtracted } from "./types.ts";
// import { assert } from "https://deno.land/std@0.158.0/_util/assert.ts";

// @ts-ignore: it has a highlight named export
// import { highlight } from "npm:cli-highlight";
// deno-lint-ignore no-explicit-any
let highlight: (args: string, opt?: any) => string;

try {
    const hl = await import("npm:cli-highlight");
    highlight = hl.highlight;
} catch (error) {
    // console.error(error.message);
    highlight = (str: string) => str;

}


if (import.meta.main) {
    const config = {
        alias: {
            headers: "h",
            method: ["X", 'x', 'm', 'M'],
            body: "b",
            hideBody: "hide-body",
            hideHeaders: "hide-headers",
            hideRequest: "hide-request",
            hideResponse: "hide-response",

        },
        boolean: ['hideRequest', 'hideResponse', 'hideBody', 'keepAlive'],
        default: {
            method: "GET",
            body: null,
            cache: "default",
            credentials: "same-origin",
            redirect: "follow", // "manual" | "follow" | "error"
            referrer: "client",
            referrerPolicy: "no-referrer",
            integrity: "",
            keepalive: false,
            mode: "cors",

            hideBody: false,
            hideHeaders: false,
            hideResponse: false,
            hideRequest: false,


        }
    };
    const args: Args = parse(Deno.args, config);
    if (args.help) {
        console.info(`Usage: fetch [options] <url>

Request initialization options:
-h, --headers           Request headers
-X, -m, --method        HTTP method
-b, --body              Request body
--keep-alive            Keep alive
--cache                 Cache mode
--credentials           Credentials mode
--redirect              Redirect mode
--referrer              Referrer
--referrer-policy       Referrer policy
--integrity             Subresource integrity
--mode                  Mode

Display options:
--hide-request          Hide all request
--hide-response         Hide response metadata
--hide-body             Hide all body
--hide-headers          Hide all headers

Other options:
--help                  Show this help
    `);
        Deno.exit(0);
    }

    const abortController = new AbortController();
    Deno.addSignalListener("SIGINT", () => {
        abortController.abort();
        Deno.exit(130);
    });
    args.headers = args.headers ? Array.isArray(args.headers) ? args.headers : [args.headers] : [];
    console.log({headers: args.headers});



    // if stdin is a TTY, read the body from the stdin
    // console.log(Deno.stdin.readable.pipeThrough);

    if (args.stdin) {
        const body = await readAll(Deno.stdin);
        args.body = new TextDecoder().decode(body);
    }
    try {
        JSON.parse(args.body);
        if (!args.headers.some((header: string) => header.toLowerCase().includes('content-type'))) {
            args.headers.push("Content-Type: application/json");
        }
    } catch {
        if (!args.headers.some((header: string) => header.toLowerCase().includes('content-type'))) {
            args.headers.push("Content-Type: text/plain");
        }
    }

    await runFetch(args, abortController.signal);
}

export function runFetch(args: Args, signal: AbortSignal | null = null): Promise<_Response> {

    let url = '';
    args.headers = args.headers ? Array.isArray(args.headers) ? args.headers : [args.headers] : [];
    if (args._.length === 0) {
        throw new Error("Error: URL is required");
    } else {
        url = `${args._[0]}`
        if (!url.match(/^https?:\/\//)) {
            url = `http://${url}`
        }
    }

    const headers = new Headers();
    for (const txt of args.headers) {
        const [key, value] = txt.replace(":", "<<::>>").split("<<::>>");
        headers.set(key, value);
    }

    const init: RequestInit = {
        method: args.method,
        headers,
        body: args.body,
        cache: args.cache,
        credentials: args.credentials,
        redirect: args.redirect,
        referrer: args.referrer,
        referrerPolicy: args.referrerPolicy,
        integrity: args.integrity,
        keepalive: args.keepalive,
        mode: args.mode,
        signal,
    };
    const request: _Request = new Request(url, init);
    request.bodyRaw = args.body;
    const { hideBody, hideHeaders, hideRequest, hideResponse } = args;

    const meta: Meta = { hideBody, hideHeaders, hideRequest, hideResponse }

    return fetchRequest(request, meta);




}



export async function fetchRequest(
    request: _Request,
    meta: Meta = {},
): Promise<_Response> {
    try {
        const {
            hideBody = false,
            hideHeaders = false,
            hideRequest = false,
            hideResponse = false,
        } = meta;

        const promise = fetch(request);

        if (!hideRequest) {
            console.info(requestToText(request));
            hideHeaders || console.info(headersToText(request.headers));
            hideBody || await printBody(request);
        }

        const response: _Response = await promise;

        hideResponse || console.info(responseToText(response));
        hideResponse || hideHeaders || console.info(headersToText(response.headers));

        if (!hideBody) {
            await printBody(response);
        }

        if (!response.bodyUsed) {
            await response.body?.cancel();
        }
        return response;
    } catch (error) {
        // console.error(error);
        throw error;


    }
}


function requestToText(request: Request): string {
    const method = request.method;
    const url = request.url;
    return `${colors.bold(`${colors.yellow(method)} ${url}`)}`;
}

function responseToText(response: Response): string {
    const statusColor = response.status >= 200 && response.status < 300
        ? colors.green
        : response.status >= 300 && response.status < 400
            ? colors.yellow
            : response.status >= 400 && response.status < 500
                ? colors.red
                : colors.bgRed;

    const status = statusColor(String(response.status));
    const statusText = response.statusText;

    return `${colors.dim(`HTTP/1.1`)} ${colors.bold(`${status} ${statusText}`)}`;


}


function headersToText(headers: Headers): string {
    let maxLengthKey = 0
    let maxLengthValue = 0

    let result = '';

    for (const [key, value] of headers.entries()) {
        maxLengthKey = Math.max(maxLengthKey, key.length);
        maxLengthValue = Math.max(maxLengthValue, value.length);
    }
    for (const [key, value] of headers.entries()) {
        result += (`${colors.blue(`${key}:`.padEnd(maxLengthKey + 1))} ${colors.white(value.padEnd(maxLengthValue + 1))}\n`)
    }

    return result;


}

async function printBody(re: _Response | _Request): Promise<void> {
    const { body, contentType } = await extractBody(re);
    console.info(await bodyToText({ body, contentType }), '\n');

}
export async function extractBody(re: _Response | _Request): Promise<BodyExtracted> {

    const contentType = re.headers.get("content-type") || "";
    const includes = (ct: string) => contentType.includes(ct);


    if (re.bodyUsed) {

        const requestExtracted =
            mimesToJSON.some((ct) => contentType.includes(ct))
                ? JSON.parse(re.bodyRaw as string)
                : re.bodyRaw;

        if (requestExtracted) {
            re.bodyExtracted = requestExtracted;
        }
        return { body: re.bodyExtracted, contentType };
    }
    if (!contentType) {

        const body = undefined;
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToArrayBuffer.some(includes)) {
        const body = await re.arrayBuffer();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToText.some(includes)) {
        const body = await re.text();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToJSON.some(includes)) {
        const body = await re.json();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToBlob.some(includes)) {
        const body = await re.blob();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToFormData.some(includes)) {
        const body = await re.formData();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    throw new Error("Unknown content type " + contentType);
}

async function bodyToText({ body, contentType }: BodyExtracted): Promise<string> {
    if (!contentType || !body) return ''


    const includes = (ct: string) => contentType.includes(ct)

    if (mimesToArrayBuffer.some(includes)) {
        return await imageToText(body as ArrayBuffer);

    }
    if (mimesToBlob.some(includes)) {
        return `${Deno.inspect(body)}`;
    }


    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    const language = contentTypeToLanguage(contentType);

    if (language) {

        try {
            return highlight(bodyStr, { language, ignoreIllegals: true });
        } catch (error) {
            console.error(language, error.message);
            throw error;
        }
    }
    if (mimesToText.some(includes)) {
        return bodyStr;
    }


    throw new Error("Unknown content type " + contentType);

}



function contentTypeToLanguage(contentType: string): string {
    let language = extension(contentType);
    if (!language) {
        const [mime] = contentType.split(";");
        [, language] = mime.split("/");
        language = language.replace(/\+.*/, '');
    }
    language ||= 'text';
    language = language !== 'plain' ? language : 'text';
    return language;

}

async function imageToText(body: ArrayBuffer): Promise<string> {
    const rawFile = new Uint8Array(body);
    const options = { rawFile }
    return [...await getImageStrings(options)].join('');
}
