import DxfParser from "./parser/DxfParser.js"

/** Fetches and parses DXF file. */
export class DxfFetcher {
    constructor(url) {
        this.url = url
    }

    GetDecodedText(arrayBuffers, encoding) {
        let buffer = "";
        let decoder = new TextDecoder(encoding);
        for (const arrayBuffer of arrayBuffers) {
            buffer += decoder.decode(arrayBuffer, {stream: true})
        }
        buffer += decoder.decode(new ArrayBuffer(0), {stream: false});
        return buffer;
    }

    GetHeaderEncoding(header) {
        if (!header) {
            return null;
        }
        const version = (header.$ACADVER && header.$ACADVER.indexOf("AC") > -1)
            ? parseInt(header.$ACADVER.replace("AC", ""))
            : Number.NaN;

        if (!isNaN(version) && (version <= 1018) && header.$DWGCODEPAGE) {
            return header.$DWGCODEPAGE.replace('ANSI_', 'windows-');
        }

        return null;
    }

    async Fetch() {
        const response = await fetch(this.url);
        let fileEncoding = "utf-8";

        const arrayBuffers = [];
        const reader = response.body.getReader()
        while(true) {
            const {done, value} = await reader.read()
            if (done) {
                break
            }
            arrayBuffers.push(value);
        }

        const parser = new DxfParser()
        let text = this.GetDecodedText(arrayBuffers, fileEncoding);
        const dxf = parser.parseSync(text, {headerOnly: true});

        const headerEncoding = this.GetHeaderEncoding(dxf.header);

        if (headerEncoding && headerEncoding !== fileEncoding) {
            text = this.GetDecodedText(arrayBuffers, headerEncoding);
        }

        return parser.parseSync(text);
    }
}
