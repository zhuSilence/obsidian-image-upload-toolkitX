import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import ObsidianPublish from "../publish";
import ImageStore from "../imageStore";
import {RegionList} from "../uploader/oss/common";

export default class PublishSettingTab extends PluginSettingTab {
    private plugin: ObsidianPublish;
    private imageStoreDiv: HTMLDivElement;

    constructor(app: App, plugin: ObsidianPublish) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): any {
        const {containerEl} = this;
        containerEl.empty()
        containerEl.createEl("h1", {text: "Upload Settings"});

        const imageStoreTypeDiv = containerEl.createDiv();
        this.imageStoreDiv = containerEl.createDiv();

        // Attachment location
        new Setting(imageStoreTypeDiv)
            .setName("Attachment location")
            .setDesc("The location storing images which will upload images from.")
            .addText(text =>
                text
                    .setPlaceholder("Enter folder name")
                    .setValue(this.plugin.settings.attachmentLocation)
                    .onChange(async (value) => {
                        if ((await this.app.vault.getAbstractFileByPath(value)) == null) {
                            new Notice(`Attachment location \"${value}\" not exist!`)
                            return
                        }
                        this.plugin.settings.attachmentLocation = value;

                    })
            );

        new Setting(imageStoreTypeDiv)
            .setName("使用相对路径")
            .setDesc("开启后，图片路径将以当前文档所在目录为基准进行查找和上传。")
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.useRelativePath)
                    .onChange(value => this.plugin.settings.useRelativePath = value)
            );

        new Setting(imageStoreTypeDiv)
            .setName("资源目录名（asset 目录）")
            .setDesc("自定义资源文件夹名称，默认为 asset")
            .addText(text =>
                text
                    .setPlaceholder("asset")
                    .setValue(this.plugin.settings.assetDirName)
                    .onChange(value => this.plugin.settings.assetDirName = value)
            );

        new Setting(imageStoreTypeDiv)
            .setName("相对路径模板")
            .setDesc("可用变量：{currentDir}、{assetDir}、{fileBaseName}、{fileName}、{imageName}")
            .addText(text =>
                text
                    .setPlaceholder("{currentDir}/{assetDir}/{fileBaseName}/{imageName}")
                    .setValue(this.plugin.settings.relativePathTemplate)
                    .onChange(value => this.plugin.settings.relativePathTemplate = value)
            );

        new Setting(imageStoreTypeDiv)
            .setName("Use image name as Alt Text")
            .setDesc("Whether to use image name as Alt Text with '-' and '_' replaced with space.")
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.imageAltText)
                    .onChange(value => this.plugin.settings.imageAltText = value)
            );

        new Setting(imageStoreTypeDiv)
            .setName("Update original document")
            .setDesc("Whether to replace internal link with store link.")
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.replaceOriginalDoc)
                    .onChange(value => this.plugin.settings.replaceOriginalDoc = value)
            );

        new Setting(imageStoreTypeDiv)
            .setName("Ignore note properties")
            .setDesc("Where to ignore note properties when copying to clipboard. This won't affect original note.")
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.ignoreProperties)
                    .onChange(value => this.plugin.settings.ignoreProperties = value)
            );

        // Image Store
        new Setting(imageStoreTypeDiv)
            .setName("Image store")
            .setDesc("Remote image store for upload images to.")
            .addDropdown(dd => {
                ImageStore.lists.forEach(s => {
                    dd.addOption(s.id, s.description);
                });
                dd.setValue(this.plugin.settings.imageStore);
                dd.onChange(async (v) => {
                    this.plugin.settings.imageStore = v;
                    this.plugin.setupImageUploader();
                    await this.drawImageStoreSettings(this.imageStoreDiv);
                });
            });
        this.drawImageStoreSettings(this.imageStoreDiv).then(() => {
        }).finally(() => {
        })
    }

    async hide(): Promise<any> {
        await this.plugin.saveSettings();
        this.plugin.setupImageUploader();
    }

    private async drawImageStoreSettings(partentEL: HTMLDivElement) {
        partentEL.empty();
        switch (this.plugin.settings.imageStore) {
            case ImageStore.IMGUR.id:
                this.drawImgurSetting(partentEL);
                break;
            case ImageStore.ALIYUN_OSS.id:
                this.drawOSSSetting(partentEL);
                break;
            case ImageStore.ImageKit.id:
                this.drawImageKitSetting(partentEL);
                break;
            case ImageStore.AWS_S3.id:
                this.drawAwsS3Setting(partentEL);
                break;
            case ImageStore.WEIXIN_MP.id:
                this.drawWexinMpSetting(partentEL);
                break;
            default:
                throw new Error(
                    "Should not reach here!"
                )
        }
    }

    private drawWexinMpSetting(parentEL: HTMLElement): void {
        // 方法的具体实现
        new Setting(parentEL)
            .setName("Upload Url")
            .setDesc("Upload Url of WinXin MP")
            .addText(text =>
                text
                    .setPlaceholder("Enter Upload Url")
                    .setValue(this.plugin.settings.weixinMpSetting.uploadUrl)
                    .onChange(value => this.plugin.settings.weixinMpSetting.uploadUrl = value))
      }

    // Imgur Setting
    private drawImgurSetting(partentEL: HTMLDivElement) {
        new Setting(partentEL)
            .setName("Client ID")
            .setDesc(PublishSettingTab.clientIdSettingDescription())
            .addText(text =>
                text
                    .setPlaceholder("Enter client_id")
                    .setValue(this.plugin.settings.imgurAnonymousSetting.clientId)
                    .onChange(value => this.plugin.settings.imgurAnonymousSetting.clientId = value)
            )
    }

    private static clientIdSettingDescription() {
        const fragment = document.createDocumentFragment();
        const a = document.createElement("a");
        const url = "https://api.imgur.com/oauth2/addclient";
        a.textContent = url;
        a.setAttribute("href", url);
        fragment.append("Generate your own Client ID at ");
        fragment.append(a);
        return fragment;
    }

    // Aliyun OSS Setting
    private drawOSSSetting(parentEL: HTMLDivElement) {
        new Setting(parentEL)
            .setName("Region")
            .setDesc("OSS data center region.")
            .addDropdown(dropdown =>
                dropdown
                    .addOptions(RegionList)
                    .setValue(this.plugin.settings.ossSetting.region)
                    .onChange(value => {
                        this.plugin.settings.ossSetting.region = value;
                        this.plugin.settings.ossSetting.endpoint = `https://${value}.aliyuncs.com/`;
                    })
            )
        new Setting(parentEL)
            .setName("Access Key Id")
            .setDesc("The access key id of AliYun RAM.")
            .addText(text =>
                text
                    .setPlaceholder("Enter access key id")
                    .setValue(this.plugin.settings.ossSetting.accessKeyId)
                    .onChange(value => this.plugin.settings.ossSetting.accessKeyId = value))
        new Setting(parentEL)
            .setName("Access Key Secret")
            .setDesc("The access key secret of AliYun RAM.")
            .addText(text =>
                text
                    .setPlaceholder("Enter access key secret")
                    .setValue(this.plugin.settings.ossSetting.accessKeySecret)
                    .onChange(value => this.plugin.settings.ossSetting.accessKeySecret = value))
        new Setting(parentEL)
            .setName("Access Bucket Name")
            .setDesc("The name of bucket to store images.")
            .addText(text =>
                text
                    .setPlaceholder("Enter bucket name")
                    .setValue(this.plugin.settings.ossSetting.bucket)
                    .onChange(value => this.plugin.settings.ossSetting.bucket = value))

        new Setting(parentEL)
            .setName("Target Path")
            .setDesc("The path to store image.\nSupport {year} {mon} {day} {random} {filename} vars. For example, /{year}/{mon}/{day}/{filename} with uploading pic.jpg, it will store as /2023/06/08/pic.jpg.")
            .addText(text =>
                text
                    .setPlaceholder("Enter path")
                    .setValue(this.plugin.settings.ossSetting.path)
                    .onChange(value => this.plugin.settings.ossSetting.path = value))

        //custom domain
        new Setting(parentEL)
            .setName("Custom Domain Name")
            .setDesc("If the custom domain name is example.com, you can use https://example.com/pic.jpg to access pic.img.")
            .addText(text =>
                text
                    .setPlaceholder("Enter path")
                    .setValue(this.plugin.settings.ossSetting.customDomainName)
                    .onChange(value => this.plugin.settings.ossSetting.customDomainName = value))
    }

    private drawImageKitSetting(parentEL: HTMLDivElement) {
        new Setting(parentEL)
            .setName("Imagekit ID")
            .setDesc(PublishSettingTab.imagekitSettingDescription())
            .addText(text =>
                text
                    .setPlaceholder("Enter your ImagekitID")
                    .setValue(this.plugin.settings.imagekitSetting.imagekitID)
                    .onChange(value => {
                        this.plugin.settings.imagekitSetting.imagekitID = value
                        this.plugin.settings.imagekitSetting.endpoint = `https://ik.imagekit.io/${value}/`
                    }))

        new Setting(parentEL)
            .setName("Folder name")
            .setDesc("Please enter the directory name, otherwise leave it blank")
            .addText(text =>
                text
                    .setPlaceholder("Enter the folder name")
                    .setValue(this.plugin.settings.imagekitSetting.folder)
                    .onChange(value => this.plugin.settings.imagekitSetting.folder = value))

        new Setting(parentEL)
            .setName("Public Key")
            .addText(text =>
                text
                    .setPlaceholder("Enter your Public Key")
                    .setValue(this.plugin.settings.imagekitSetting.publicKey)
                    .onChange(value => this.plugin.settings.imagekitSetting.publicKey = value))

        new Setting(parentEL)
            .setName("Private Key")
            .addText(text =>
                text
                    .setPlaceholder("Enter your Private Key")
                    .setValue(this.plugin.settings.imagekitSetting.privateKey)
                    .onChange(value => this.plugin.settings.imagekitSetting.privateKey = value))
    }

    private static imagekitSettingDescription() {
        const fragment = document.createDocumentFragment();
        const a = document.createElement("a");
        const url = "https://imagekit.io/dashboard/developer/api-keys";
        a.textContent = url;
        a.setAttribute("href", url);
        fragment.append("Obtain id and keys from ");
        fragment.append(a);
        return fragment;
    }

    private drawAwsS3Setting(parentEL: HTMLDivElement) {
        // Add AWS S3 configuration section
        new Setting(parentEL)
            .setName('AWS S3 Access Key ID')
            .setDesc('Your AWS S3 access key ID')
            .addText(text => text
                .setPlaceholder('Enter your access key ID')
                .setValue(this.plugin.settings.awsS3Setting?.accessKeyId || '')
                .onChange(value => this.plugin.settings.awsS3Setting.accessKeyId = value
                ));

        new Setting(parentEL)
            .setName('AWS S3 Secret Access Key')
            .setDesc('Your AWS S3 secret access key')
            .addText(text => text
                .setPlaceholder('Enter your secret access key')
                .setValue(this.plugin.settings.awsS3Setting?.secretAccessKey || '')
                .onChange(value => this.plugin.settings.awsS3Setting.secretAccessKey = value));

        new Setting(parentEL)
            .setName('AWS S3 Region')
            .setDesc('Your AWS S3 region')
            .addText(text => text
                .setPlaceholder('Enter your region')
                .setValue(this.plugin.settings.awsS3Setting?.region || '')
                .onChange(value => this.plugin.settings.awsS3Setting.region = value));

        new Setting(parentEL)
            .setName('AWS S3 Bucket Name')
            .setDesc('Your AWS S3 bucket name')
            .addText(text => text
                .setPlaceholder('Enter your bucket name')
                .setValue(this.plugin.settings.awsS3Setting?.bucketName || '')
                .onChange(value => this.plugin.settings.awsS3Setting.bucketName = value));
        new Setting(parentEL)
            .setName("Target Path")
            .setDesc("The path to store image.\nSupport {year} {mon} {day} {random} {filename} vars. For example, /{year}/{mon}/{day}/{filename} with uploading pic.jpg, it will store as /2023/06/08/pic.jpg.")
            .addText(text =>
                text
                    .setPlaceholder("Enter path")
                    .setValue(this.plugin.settings.ossSetting.path)
                    .onChange(value => this.plugin.settings.awsS3Setting.path = value))

        //custom domain
        new Setting(parentEL)
            .setName("Custom Domain Name")
            .setDesc("If the custom domain name is example.com, you can use https://example.com/pic.jpg to access pic.img.")
            .addText(text =>
                text
                    .setPlaceholder("Enter path")
                    .setValue(this.plugin.settings.ossSetting.customDomainName)
                    .onChange(value => this.plugin.settings.awsS3Setting.customDomainName = value))
    }
}