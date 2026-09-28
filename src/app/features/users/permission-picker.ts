import { Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlatformOperatorPermissionDefinition, PlatformOperatorRole } from '@core/models.platform';

/** Checkbox list of the grants a target role may hold, with each grant's label, description and
 * stable key. An empty selection is valid (basic self-service access only), so "Clear all" is
 * always offered; "Use role defaults" only when the backend supplied defaults. */
@Component({
  selector: 'app-permission-picker',
  imports: [TranslocoPipe],
  template: `
    <div class="perm-toolbar">
      <span class="muted">{{ 'perms.selectedCount' | transloco: { count: selected().length, total: definitions().length } }}</span>
      <span class="perm-toolbar-actions">
        @if (defaults().length) {
          <button type="button" class="btn-text" (click)="selectedChange.emit(defaults())">
            {{ 'perms.useDefaults' | transloco: { role: ('role.' + role() | transloco) } }}
          </button>
        }
        <button type="button" class="btn-text" [disabled]="!selected().length" (click)="selectedChange.emit([])">
          {{ 'perms.clearAll' | transloco }}
        </button>
      </span>
    </div>
    <div class="perm-list">
      @for (def of definitions(); track def.key) {
        <label class="perm-item" [class.active]="selectedSet().has(def.key)">
          <input type="checkbox" [checked]="selectedSet().has(def.key)" (change)="toggle(def.key)" />
          <span class="perm-copy">
            <strong>{{ def.label }}</strong>
            @if (def.description) {
              <span class="perm-desc">{{ def.description }}</span>
            }
            <code class="perm-key">{{ def.key }}</code>
          </span>
        </label>
      }
    </div>
    @if (!selected().length) {
      <p class="field-hint">{{ 'perms.emptyHint' | transloco }}</p>
    }
  `,
  styles: `
    .perm-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin: 8px 0;
      font-size: 13px;
    }
    .perm-toolbar-actions {
      display: flex;
      gap: 12px;
    }
    .perm-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 8px;
    }
    .perm-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid #dcd5d5;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
    }
    .perm-item.active {
      border-color: #1fa64d;
      background: #e8f6ed;
    }
    .perm-item input {
      margin-top: 2px;
      accent-color: #1fa64d;
      cursor: pointer;
    }
    .perm-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .perm-copy strong {
      font-size: 13px;
    }
    .perm-desc {
      font-size: 12px;
      color: #7e7676;
    }
    .perm-key {
      font-size: 11px;
      color: #7e7676;
      direction: ltr;
      unicode-bidi: isolate;
      word-break: break-all;
    }
  `,
})
export class PermissionPicker {
  /** Already filtered to the target role. */
  readonly definitions = input.required<PlatformOperatorPermissionDefinition[]>();
  readonly selected = input.required<string[]>();
  readonly role = input.required<PlatformOperatorRole>();
  readonly defaults = input<string[]>([]);
  readonly selectedChange = output<string[]>();

  readonly selectedSet = computed(() => new Set(this.selected()));

  toggle(key: string): void {
    const current = this.selected();
    this.selectedChange.emit(current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }
}
