type Color = [number, number, number, number];
type Callback = (cbData?: any) => void;
type Position = {
    x: number,
    y: number
    z?: number;
};

interface ISoundArray { [index: string]: [string, string, boolean] };
interface IMenuControls { [index: string]: number };

interface ICustomHeader
{
    dict: string;
    texture: string;
}

interface IMenuButtons
{
    text: string;
    description?: string;
    onPressed?: Callback;

    checkbox?: boolean;
    onCheck?: Callback;
    
    list?: string[];
    listIndex?: number;
    onListIndexChange?: Callback;
}

interface IMenuOptions
{
    enableHeader?: boolean;
    enableGlare?: boolean;
    enablePageCounter?: boolean;

    headerColor?: Color;
    customHeader?: ICustomHeader;
}

interface ICheetoUI
{
    title: string;
    subtitle: string;
    closable?: boolean;
    options?: IMenuOptions;

    menuHandler?: any;
    buttons?: IMenuButtons[];
}

interface IMenuStates
{
    btnIndex: number;
}

function PushText(textString: string, fontIndex: number, scale: number, color: (Color | number[]), position: Position): void
{
    SetTextFont(fontIndex)
    SetTextScale(0.0, scale)
    SetTextColour(color[0], color[1], color[2], color[3])
    SetTextEntry("STRING")
    AddTextComponentString(textString || '')
    DrawText(position.x, position.y) 
};

function PushSound(soundName: string): void
{
    const sound = CheetoUI.MenuSounds[soundName];
    if (!sound) return;
    PlaySoundFrontend(-1, sound[1], sound[0], sound[2]);
}

function GetPlayerKeyState(key: string): boolean { return IsControlJustPressed(0, CheetoUI.MenuControls[key]) };

class CheetoUI
{
    public menu: ICheetoUI;
    private menuStates: IMenuStates;

    public static isMenuOpened: boolean = false;
    public static menuTick: any;

    private isGlareLoaded: boolean = false;
    private glareHandle: any;
    private activeBtn: (IMenuButtons | undefined);

    public static defaultStates: IMenuStates = {
        btnIndex: 0,
    }

    constructor(menuStruct: ICheetoUI)
    {
        this.menu = menuStruct;
        this.menuStates = CheetoUI.defaultStates;
        this.menu.buttons = [];
    }

    public static MenuConfig = {
        glareScaleformName: "MP_MENU_GLARE",
        texturesDict: "commonmenu",

        enableSounds: false,

        globalFontIndex: 0,
        globalFontColor: {
            inactive: [245, 245, 245, 235],
            active: [10, 10, 10, 250]
        },

        structPosition: {
            x: 0.15,
            y: 0.135
        },

        globalWidth: 0.210,

        header: {
            height: 0.095,
            color: [38, 92, 180, 245],
            title: {
                fontIndex: 1,
                size: 0.70
            }
        },

        subtitle: {
            textSize: 0.25,
            rect: {
                color: [26, 26, 26, 245],
                height: 0.025,
            }
        },

        button: {
            textSize: 0.265,

            rect: {
                height: 0.0295,
                color: {
                    inactive: [26, 26, 26, 195],
                    active: [250, 250, 250, 245]
                }
            },

            checkbox: {
                texture: {
                    inactive: {
                        unchecked: 'shop_box_blank',
                        checked: 'shop_box_tick'
                    },

                    active: {
                        unchecked: 'shop_box_blankb',
                        checked: 'shop_box_tickb'
                    }
                },
                
                size: {
                    width: 0.02,
                    height: 0.03
                }
            },

            list: {
                color: {
                    active: [10, 10, 10, 245],
                    inactive: [250, 250, 250, 245]
                },

                texture: {
                    left: 'arrowleft',
                    right: 'arrowright'
                },

                size: {
                    width: 0.01,
                    height: 0.02
                }
            }
        },

        description: {
            miniBar: {
                height: 0.002,
                alpha: 210,
            },

            height: 0.025,
            alpha: 245,
            textSize: 0.22,
            textColor: [235, 235, 235, 140]
        }
    };

    public static MenuSounds: ISoundArray = {
        open: ["GTAO_FM_Events_Soundset", "OOB_Start", false],
    }

    public static MenuControls: IMenuControls = {
        navigateUp: 300,
        navigateDown: 299,
        select: 215,
        close: 202,
        clickLeft: 174,
        clickRight: 175
    }
    
    private getTextLength(text: string): number
    {
        return (text.toLowerCase().replace(' ', '').length);
    }

    public static createMenu(title: string, subtitle: string, closable?: boolean, options?: IMenuOptions, menuHandler?: Callback): (CheetoUI | undefined)
    {
        if (this.isMenuOpened) return;

        const GlobalConfig = this.MenuConfig;
        let instance: CheetoUI = new CheetoUI({ title, subtitle, closable, options, menuHandler });
        this.isMenuOpened = true;

        if (GlobalConfig.enableSounds) PushSound('open');
        RequestStreamedTextureDict(GlobalConfig.texturesDict, true);
        if (instance.menu.options?.customHeader! !== undefined) RequestStreamedTextureDict(instance.menu.options?.customHeader?.dict!, true);

        this.menuTick = setTick(() => {
            if (!this.isMenuOpened) clearTick(this.menuTick);

            instance.drawMenu();
            instance.menu.menuHandler((btnsData?: IMenuButtons[]) => {
                if (btnsData) instance.refreshMenu(btnsData);
            })
        })

        return instance;
    }

    public static closeMenu(): void { this.isMenuOpened = false };

    private refreshMenu(btns: IMenuButtons[]): void
    {
        if (!btns || (btns.length < 1)) return;
        for (let i = 0; i < btns.length; i++)
        {
            this.menu.buttons![i] = btns[i];
            this.activeBtn = this.menu.buttons![this.menuStates.btnIndex]

            this.drawButton(this.menu.buttons![i], i);
        }
    }

    private setMenuControlsHandler(): void
    {
        if (GetPlayerKeyState('navigateUp'))
        {
            (this.menu.buttons![this.menuStates.btnIndex - 1] ? this.menuStates.btnIndex-- : this.menuStates.btnIndex = (this.menu.buttons?.length! - 1));
        }
        else if (GetPlayerKeyState('navigateDown'))
        {
            (this.menu.buttons![this.menuStates.btnIndex + 1] ? ++this.menuStates.btnIndex : this.menuStates.btnIndex = 0);
        }
        else if (GetPlayerKeyState('select'))
        {
            if (this.activeBtn?.onPressed) this.activeBtn?.onPressed();
            if (this.activeBtn?.onCheck ?? false)
            {
                this.activeBtn!.checkbox = !this.activeBtn!.checkbox;
                this.activeBtn!.onCheck?.(this.activeBtn!.checkbox);
            }
        }
        else if (GetPlayerKeyState('clickRight'))
        {
            if (!this.activeBtn?.list) return;
            let actualListIndex: number = (this.activeBtn?.listIndex ?? 0);
            let listValueLength: number = ((this.activeBtn?.list?.length - 1) ?? 0);

            if (actualListIndex < listValueLength)
            {
                this.activeBtn!.listIndex! = (this.activeBtn!.listIndex! + 1);
            }
            else this.activeBtn!.listIndex! = 0;
            if (this.activeBtn?.onListIndexChange) this.activeBtn?.onListIndexChange(this.activeBtn!.listIndex!);
        }
        else if (GetPlayerKeyState('clickLeft'))
        {
            if (!this.activeBtn?.list) return;
            let actualListIndex: number = (this.activeBtn?.listIndex ?? 0);
            let listValueLength: number = ((this.activeBtn?.list?.length - 1) ?? 0);

            if (actualListIndex === 0)
            {
                this.activeBtn!.listIndex! = listValueLength;
            }
            else this.activeBtn!.listIndex! = (this.activeBtn!.listIndex! - 1);
            if (this.activeBtn?.onListIndexChange) this.activeBtn?.onListIndexChange(this.activeBtn!.listIndex!);
        }
        else if (GetPlayerKeyState('close')) { CheetoUI.closeMenu() };
    }

    private drawDescription(): void
    {
        const GlobalConfig = CheetoUI.MenuConfig;
        const descriptionColor: (Color | number[]) = (this.menu.options?.headerColor ? this.menu.options?.headerColor : GlobalConfig.header.color);

        let miniBarPosition: Position['y'] = (GlobalConfig.structPosition.y + 0.0895 + (0.03 * (this.menu.buttons?.length! - 1)) + 0.0165);
        let descriptionBarPosition: Position['y'] = (miniBarPosition + ((GlobalConfig.description.height / 2) + (GlobalConfig.description.miniBar.height / 2)));
        
        DrawRect(GlobalConfig.structPosition.x, miniBarPosition, GlobalConfig.globalWidth, GlobalConfig.description.miniBar.height, descriptionColor[0], descriptionColor[1], descriptionColor[2], GlobalConfig.description.miniBar.alpha);
        DrawRect(GlobalConfig.structPosition.x, descriptionBarPosition, GlobalConfig.globalWidth, GlobalConfig.description.height, GlobalConfig.subtitle.rect.color[0], GlobalConfig.subtitle.rect.color[1], GlobalConfig.subtitle.rect.color[2], GlobalConfig.description.alpha);
        PushText(this.activeBtn?.description!, GlobalConfig.globalFontIndex, GlobalConfig.description.textSize, GlobalConfig.description.textColor, {
            x: (GlobalConfig.structPosition.x - 0.1),
            y: (descriptionBarPosition - 0.010)
        });
    }

    private drawCheckbox(btnIndex: number, buttons: IMenuButtons): void
    {
        const GlobalConfig = CheetoUI.MenuConfig;
        let isBtnActive: boolean = (btnIndex === this.menuStates.btnIndex);

        let checkState: boolean = (buttons.checkbox ?? false);
        let checkBoxTexture: string = (checkState ? (isBtnActive ? GlobalConfig.button.checkbox.texture.active.checked : GlobalConfig.button.checkbox.texture.inactive.checked) : (isBtnActive ? GlobalConfig.button.checkbox.texture.active.unchecked : GlobalConfig.button.checkbox.texture.inactive.unchecked));

        DrawSprite(GlobalConfig.texturesDict, checkBoxTexture, (GlobalConfig.structPosition.x + 0.095), (GlobalConfig.structPosition.y + 0.0895 + (0.03 * btnIndex)), GlobalConfig.button.checkbox.size.width, GlobalConfig.button.checkbox.size.height, 0.0, 255, 255, 255, 245);
    }

    private drawList(btnIndex: number, button: IMenuButtons): void
    {
        const GlobalConfig = CheetoUI.MenuConfig;
        let isBtnActive: boolean = (btnIndex === this.menuStates.btnIndex);

        let textureColor: (Color | number[]) = (isBtnActive ? GlobalConfig.button.list.color.active : GlobalConfig.button.list.color.inactive);
        let btnTextColor: number[] = (isBtnActive ? GlobalConfig.globalFontColor.active : GlobalConfig.globalFontColor.inactive);

        const rightArrowPosition: { x: number, y: number } = {
            x: GlobalConfig.structPosition.x + 0.098,
            y: (GlobalConfig.structPosition.y + 0.0895 + (0.03 * btnIndex))
        };

        DrawSprite(GlobalConfig.texturesDict, GlobalConfig.button.list.texture.right, rightArrowPosition.x, rightArrowPosition.y, GlobalConfig.button.list.size.width, GlobalConfig.button.list.size.height, 0.0, textureColor[0], textureColor[1], textureColor[2], textureColor[3]);
        
        let listIndexValue: (string | undefined) = (button.list![button.listIndex ?? 0] ?? '');
        let textLength: number = this.getTextLength(listIndexValue);
        if (listIndexValue.length > 0)
        {
            let textPosition: Position['x'] = (rightArrowPosition.x - ((GlobalConfig.button.list.size.width * (Math.floor(textLength) / 2)) + (0.0025 * 2.55)))
            PushText(listIndexValue, GlobalConfig.globalFontIndex, (GlobalConfig.button.textSize - 0.015), btnTextColor, {
                x: textPosition,
                y: (rightArrowPosition.y - 0.0109)
            })
        }

        let leftArrowPosition: { x: number, y: number } = {
            x: (rightArrowPosition.x - ((GlobalConfig.button.list.size.width * (Math.floor(textLength) / 2)) + (0.0050 * 2.5))),
            y: rightArrowPosition.y
        }

        DrawSprite(GlobalConfig.texturesDict, GlobalConfig.button.list.texture.left, leftArrowPosition.x, leftArrowPosition.y, GlobalConfig.button.list.size.width, GlobalConfig.button.list.size.height, 0.0, textureColor[0], textureColor[1], textureColor[2], textureColor[3]);
    }

    private drawButton(btnData: IMenuButtons, btnIndex: number): void
    {
        const GlobalConfig = CheetoUI.MenuConfig;
        let isBtnActive: boolean = (btnIndex === this.menuStates.btnIndex);
        
        let btnColor: number[] = (isBtnActive ? GlobalConfig.button.rect.color.active : GlobalConfig.button.rect.color.inactive);
        let btnStructPosition: Position = {
            x: GlobalConfig.structPosition.x,
            y: (GlobalConfig.structPosition.y + 0.0895)
        }

        if (btnIndex > 0) btnStructPosition.y += ((btnStructPosition.y / 7.6) * btnIndex);
        DrawRect(btnStructPosition.x, btnStructPosition.y, GlobalConfig.globalWidth, GlobalConfig.button.rect.height, btnColor[0], btnColor[1], btnColor[2], btnColor[3]);
        
        let btnTextColor: number[] = (isBtnActive ? GlobalConfig.globalFontColor.active : GlobalConfig.globalFontColor.inactive);
        if (btnData.text.length > 0)
        {
            PushText(btnData.text, GlobalConfig.globalFontIndex, GlobalConfig.button.textSize, btnTextColor, {
                x: (btnStructPosition.x - 0.10),
                y: (btnStructPosition.y - 0.0115)
            })
        }

        if (this.activeBtn?.description! && this.activeBtn?.description?.length! > 0) this.drawDescription();
        if (btnData.checkbox! !== undefined) this.drawCheckbox(btnIndex, btnData);
        if (btnData.list! !== undefined) this.drawList(btnIndex, btnData);
    }

    private drawMenu(): void
    {
        const HeaderEnabled: boolean = (this.menu.options?.enableHeader ?? true);
        if (HeaderEnabled) this.drawHeader();
        this.drawSubtitle();
        this.setMenuControlsHandler();
    }

    private drawSubtitle(): void
    {
        const GlobalConfig = CheetoUI.MenuConfig;
        const rectColor: number[] = GlobalConfig.subtitle.rect.color;
        const subtitleStructPosition: Position = {
            x: GlobalConfig.structPosition.x,
            y: (GlobalConfig.structPosition.y + 0.061)
        }
        
        DrawRect(subtitleStructPosition.x, subtitleStructPosition.y, GlobalConfig.globalWidth, GlobalConfig.subtitle.rect.height, rectColor[0], rectColor[1], rectColor[2], rectColor[3]);
        if (this.menu.subtitle.length > 0)
        {
            PushText(this.menu.subtitle.toUpperCase(), GlobalConfig.globalFontIndex, GlobalConfig.subtitle.textSize, GlobalConfig.globalFontColor.inactive, { 
                x: (subtitleStructPosition.x - 0.1),
                y: (subtitleStructPosition.y - 0.010)
            })
        }

        const PageCounterEnabled: boolean = (this.menu.options?.enablePageCounter ?? true);
        let btnCounter: number = (this.menu.buttons?.length! < 1 ? 0 : this.menuStates.btnIndex + 1);
        let maxBtn: number = (this.menu.buttons?.length ?? 0);
        if (PageCounterEnabled)
        {
            PushText(`${btnCounter} / ${maxBtn}`, GlobalConfig.globalFontIndex, GlobalConfig.subtitle.textSize, GlobalConfig.globalFontColor.inactive, { 
                x: (subtitleStructPosition.x + 0.08),
                y: (subtitleStructPosition.y - 0.010)
            })
        }
    }

    private drawTitle(): void
    {
        PushText(this.menu.title, CheetoUI.MenuConfig.header.title.fontIndex, CheetoUI.MenuConfig.header.title.size, [255, 255, 255, 255], { 
            x: CheetoUI.MenuConfig.structPosition.x / 2.5,
            y: CheetoUI.MenuConfig.structPosition.y / (CheetoUI.MenuConfig.header.height * 12.05)
        })
    }

    private drawHeader(): void
    {
        const GlobalConfig = CheetoUI.MenuConfig;
        const customHeader: [boolean, ICustomHeader] = [
            (this.menu.options?.customHeader !== undefined ?? false),
            this.menu.options?.customHeader! ?? {}
        ];

        let headerColor = (this.menu.options?.headerColor ?? GlobalConfig.header.color);

        if (!customHeader[0]) DrawRect(GlobalConfig.structPosition.x, GlobalConfig.structPosition.y, GlobalConfig.globalWidth, GlobalConfig.header.height, headerColor[0], headerColor[1], headerColor[2], headerColor[3]);
        else DrawSprite(customHeader[1].dict, customHeader[1].texture, GlobalConfig.structPosition.x, GlobalConfig.structPosition.y, GlobalConfig.globalWidth, GlobalConfig.header.height, 0.0, 255, 255, 255, headerColor[3]);
        
        if (this.menu.title.length > 0) this.drawTitle();
        if (this.menu.options?.enableGlare)
        {
            if (!this.isGlareLoaded)
            {
                this.glareHandle = RequestScaleformMovie(GlobalConfig.glareScaleformName);
                if (HasScaleformMovieLoaded(this.glareHandle)) this.isGlareLoaded = true;
            }
            else DrawScaleformMovie(this.glareHandle, (GlobalConfig.structPosition.x * 3.118), (GlobalConfig.structPosition.y * 4.182), (GlobalConfig.globalWidth * 4.5), (GlobalConfig.header.height * 11.15), 255, 255, 255, 255, 1);
        }
    }
}

// debug part
let check: boolean = false
let indexStorage: number = 0;
let btns: IMenuButtons[] = [
    {
        text: "testo cheeto",
        description: "This is description",
        onPressed: () => {
            console.log('test cheeto enter pressed')
        }
    },
    {
        text: 'second button ok!',
        list: ['Test', 'damn', 'yooo'],
        listIndex: indexStorage,
        onListIndexChange: (Index: number) => {
            console.log(Index)
            indexStorage = Index;
        }
    },
    {
        text: 'testing btn'
    }
]

RegisterCommand('cheeto', () => {
    CheetoUI.createMenu('Cheeto Menu', 'Subtitle!', true, { enableGlare: false }, (cb: Callback) => {
        cb(btns);
    });
}, false)