export interface KeyboardShortcuts {
  onTogglePaused?: () => void;
  onReset?: () => void;
  onTogglePanelVisibility?: () => void;
}

export class KeyboardControls {
  private shortcuts: KeyboardShortcuts;
  private isPaused: boolean = false;
  private boundOnKeyDown: (event: KeyboardEvent) => void;

  constructor(shortcuts: KeyboardShortcuts) {
    this.shortcuts = shortcuts;
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this.boundOnKeyDown);
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Don't trigger if user is typing in an input
    if ((event.target as HTMLElement).tagName === 'INPUT') {
      return;
    }

    switch (event.code) {
      case 'KeyF':
        if (event.ctrlKey) {
          event.preventDefault();
          this.shortcuts.onTogglePanelVisibility?.();
        }
        break;
      case 'KeyP':
        event.preventDefault();
        this.isPaused = !this.isPaused;
        this.shortcuts.onTogglePaused?.();
        break;
      case 'KeyR':
        if (event.ctrlKey) {
          event.preventDefault();
          this.shortcuts.onReset?.();
        }
        break;
    }
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.boundOnKeyDown);
  }
}
