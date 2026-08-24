import { expect, type Locator, type Page } from "@playwright/test";

export class PlaygroundPage {
  constructor(readonly page: Page) {}

  static async open(page: Page): Promise<PlaygroundPage> {
    const pg = new PlaygroundPage(page);
    await page.goto("/playground");
    await pg.editorReady();
    return pg;
  }

  async editorReady(): Promise<void> {
    await expect(this.page.locator(".monaco-editor").first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.locator(".monaco-editor textarea").first()).toBeAttached();
  }

  get editor(): Locator {
    return this.page.locator(".monaco-editor").first();
  }

  async setCode(code: string): Promise<void> {
    await this.editor.click();
    await this.page.keyboard.press("ControlOrMeta+A");
    await this.page.keyboard.press("Delete");
    await this.page.keyboard.type(code);
  }

  async codeText(): Promise<string> {
    return (await this.editor.innerText()).replace(/ /g, " ");
  }

  get runButton(): Locator {
    return this.page.getByRole("button", { name: /^run$/i });
  }

  async run(): Promise<void> {
    await this.runButton.click();
    await this.waitForRunToSettle();
  }

  async runWithKeyboard(): Promise<void> {
    await this.editor.click();
    await this.page.keyboard.press("ControlOrMeta+Enter");
    await this.waitForRunToSettle();
  }

  async waitForRunToSettle(): Promise<void> {
    await expect(this.page.getByRole("button", { name: /^running$/i })).toHaveCount(0, { timeout: 30_000 });
  }

  engineChip(label: string): Locator {
    return this.page.getByRole("checkbox", { name: label });
  }

  async toggleEngine(label: string): Promise<void> {
    await this.engineChip(label).click();
  }

  engineTab(label: string): Locator {
    return this.page.getByRole("tab", { name: new RegExp(`^${label}`) });
  }

  async selectEngineTab(label: string): Promise<void> {
    await this.engineTab(label).click();
  }

  get outputPane(): Locator {
    return this.page.locator("main, body").first();
  }

  async outputText(): Promise<string> {
    return this.page.locator("body").innerText();
  }

  flagSelector(engineName: string): Locator {
    return this.page.getByRole("combobox", { name: new RegExp(`${engineName} flags?`, "i") });
  }

  get shareButton(): Locator {
    return this.page.getByRole("button", { name: /share this snippet/i });
  }

  get historyButton(): Locator {
    return this.page.getByRole("button", { name: /run history/i });
  }

  get samplesButton(): Locator {
    return this.page.getByRole("button", { name: /browse code samples/i });
  }

  get v8SamplesButton(): Locator {
    return this.page.getByRole("button", { name: /browse v8 internals samples/i });
  }

  get saveSampleButton(): Locator {
    return this.page.getByRole("button", { name: /save the current snippet/i });
  }

  get diffButton(): Locator {
    return this.page.getByRole("button", { name: /^diff$/i });
  }

  get intrinsicsButton(): Locator {
    return this.page.getByRole("button", { name: /v8 intrinsics reference/i });
  }

  get announcer(): Locator {
    return this.page.locator('[role="status"][aria-live="polite"]');
  }
}

export const V8_BYTECODE = /Ldar|Star|Return|Add|LdaSmi|CallUndefinedReceiver/;
