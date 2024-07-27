import ImageUploader from "../imageUploader";
import { requestUrl, RequestUrlResponse } from "obsidian";
import ApiError from "../apiError";

export default class WeiXinMpUploader implements ImageUploader {
    private readonly appId: string;
    private readonly appSecret!: string;

    private ACCESS_TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=";
    private UPLOAD_IMAGE_URL = "https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=";


    constructor(setting: WeiXinMpSetting) {
        this.appId = setting.appId;
        this.appSecret = setting.appSecret;
        this.ACCESS_TOKEN_URL += this.appId + "&secret=" + this.appSecret;
    }

    async upload(image: File, fullPath: string): Promise<string> {
        await requestUrl({
            url: this.ACCESS_TOKEN_URL,
            method: "GET",
            async: true,
            contentType: "application/json",
            headers: { "Content-Type": "application/json" },
            success: async (tokenResp: RequestUrlResponse) => {
                const accessToken = (await tokenResp.json).access_token;
                const requestData = new FormData();
                requestData.append("image", image);
                const resp = await requestUrl({
                    body: await image.arrayBuffer(),
                    headers: { "Content-Type": "multipart/form-data" },
                    method: "POST",
                    url: this.UPLOAD_IMAGE_URL + accessToken + "&type=image"});
                if ((await resp).status != 200) {
                    await handleImgurErrorResponse(resp);
                }
                return ((await resp.json) as ImgurPostData).Url;
            }
        })
        return "weixin upload error";
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
    appId: string;
    appSecret: string;
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