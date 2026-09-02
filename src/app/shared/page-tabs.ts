import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

export interface PageTab {
  id: string;
  labelKey: string;
  count?: number;
}

@Component({
  selector: 'app-page-tabs',
  imports: [TranslocoPipe],
  template: `
    <div class="page-tabs" role="tablist">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          class="page-tab"
          [class.active]="tab.id === active()"
          [attr.aria-selected]="tab.id === active()"
          (click)="activeChange.emit(tab.id)"
        >
          {{ tab.labelKey | transloco }}
          @if (tab.count != null) {
            <span>({{ tab.count }})</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    .page-tabs {
      display: flex;
      gap: 24px;
      border-bottom: 1px solid #e6e6e6;
      margin-bottom: 16px;
    }
    .page-tab {
      border: 0;
      background: transparent;
      padding: 0 0 8px;
      font-size: 14px;
      font-weight: 500;
      color: #737373;
      cursor: pointer;
      position: relative;
    }
    .page-tab.active {
      font-weight: 600;
      color: #1fa64d;
    }
    .page-tab.active::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 3px;
      border-radius: 2px;
      background: #1fa64d;
    }
  `,
})
export class PageTabs {
  readonly tabs = input.required<PageTab[]>();
  readonly active = input.required<string>();
  readonly activeChange = output<string>();
}
