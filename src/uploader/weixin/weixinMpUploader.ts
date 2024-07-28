import ImageUploader from "../imageUploader";
import { requestUrl, RequestUrlResponse } from "obsidian";
import ApiError from "../apiError";

export default class WeiXinMpUploader implements ImageUploader {
    private readonly uploadUrl: string;

    constructor(setting: WeiXinMpSetting) {
        this.uploadUrl = setting.uploadUrl;
    }

    async upload(image: File, fullPath: string): Promise<string> {
        // 上传图片
        const formData = {
            type: "image",
            media: image.arrayBuffer()
        };
        const resp = await requestUrl({
            body: formData,
            //await image.arrayBuffer(),
            headers: { "Content-Type": "multipart/form-data" },
            method: "POST",
            url: this.uploadUrl
        });
        if ((await resp).status != 200) {
            await handleImgurErrorResponse(resp);
        }
        return ((await resp.json) as ImgurPostData).Url;
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