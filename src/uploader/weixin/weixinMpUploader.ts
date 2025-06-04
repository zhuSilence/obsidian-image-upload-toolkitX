import ImageUploader from "../imageUploader";
import { requestUrl, RequestUrlResponse } from "obsidian";
import ApiError from "../apiError";
import * as crypto from "crypto";

export default class WeiXinMpUploader implements ImageUploader {
    private readonly uploadUrl: string;

    constructor(setting: WeiXinMpSetting) {
        this.uploadUrl = setting.uploadUrl;
    }

    async upload(image: File, fullPath: string): Promise<string> {

        const boundary = chooseBoundary()
        const end_boundary = '\r\n--' + boundary + '--\r\n';
        let formDataString = '';
        formDataString += '--' + boundary + '\r\n';

        // 上传图片
        formDataString += `Content-Disposition: form-data; name="media"; filename=\"${image.name}\"` + '\r\n';
        formDataString += `Content-Type: multipart/form-data` + '\r\n\r\n';
        const formDatabuffer = Buffer.from(formDataString, 'utf-8');	// utf8 encode, for chinese
        let resultArray = Array.from(formDatabuffer);
        // console.log(formDataString);

        let blobBytes: ArrayBuffer | null = null;
        blobBytes = await image.arrayBuffer();
        // 把buffer转为typed array数据、再转为普通数组使之可以使用数组的方法
        const pic_typedArray = new Uint8Array(blobBytes);

        let endBoundaryArray = [];
        for (let i = 0; i < end_boundary.length; i++) { // 最后取出结束boundary的charCode
            endBoundaryArray.push(end_boundary.charCodeAt(i));
        }

        let postArray = resultArray.concat(Array.prototype.slice.call(pic_typedArray), endBoundaryArray);
        const post_typedArray = new Uint8Array(postArray)
        const header = {
            'Content-Type': 'multipart/form-data; boundary=' + boundary,
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': '*/*',
            'Connection': 'keep-alive',
        };

        const resp = await requestUrl({
            body: post_typedArray.buffer,
            headers: header,
            method: "POST",
            url: this.uploadUrl
        });
        console.log(resp)
        if ((await resp).status != 200) {
            await handleImgurErrorResponse(resp);
        }
        return resp.text;
    }

    private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
}
export interface WeiXinMpSetting {
    uploadUrl: string;
}

type ImgurPostData = {
    Access_token: string;
    Expires_in: string;
    Url: string;

};

export async function handleImgurErrorResponse(resp: RequestUrlResponse): Promise<void> {
    if ((await resp).headers["Content-Type"] === "application/json") {
        throw new ApiError("weixin mp error");
    }
    throw new Error(resp.text);
}

export const chooseBoundary = (): string => {
    const boundary = crypto.randomBytes(16).toString("hex");
    return boundary;
  }