import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { SETTINGS_LINK, inboxPath, navLinks, portalKey, searchPath, searchPlaceholderKey } from '@core/auth/nav';
import { AtlasApi } from '@core/http/atlas-api';
import { InboxItem } from '@core/models';
import { LanguageSwitch } from '@shared/language-switch';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe, LanguageSwitch],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly api = inject(AtlasApi);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);
  readonly confirmSignOut = signal(false);
  readonly inboxOpen = signal(false);
  readonly inboxItems = signal<InboxItem[]>([]);
  readonly searchQuery = signal('');
  readonly settings = SETTINGS_LINK;

  readonly links = computed(() => navLinks(this.auth.user()));
  readonly portal = computed(() => {
    const audience = this.auth.user()?.audience;
    return audience === 'operator' ? null : portalKey(audience);
  });
  readonly searchKey = computed(() => searchPlaceholderKey(this.auth.user()?.audience));
  readonly inboxHref = computed(() => inboxPath(this.auth.user()?.audience));
  readonly unreadCount = computed(() => this.inboxItems().filter((item) => item.unread).length);

  constructor() {
    this.loadInbox();
    effect((onCleanup) => {
      document.body.classList.toggle('nav-lock', this.menuOpen() || this.confirmSignOut());
      onCleanup(() => document.body.classList.remove('nav-lock'));
    });
  }

  close(): void {
    this.menuOpen.set(false);
  }

  askSignOut(event: Event): void {
    event.stopPropagation();
    this.close();
    this.inboxOpen.set(false);
    this.confirmSignOut.set(true);
  }

  cancelSignOut(): void {
    this.confirmSignOut.set(false);
  }

  signOut(): void {
    this.confirmSignOut.set(false);
    this.close();
    this.auth.logout(true);
  }

  toggleMenu(): void {
    this.inboxOpen.set(false);
    this.confirmSignOut.set(false);
    this.menuOpen.update((open) => !open);
  }

  toggleInbox(event: Event): void {
    event.stopPropagation();
    this.confirmSignOut.set(false);
    this.inboxOpen.update((open) => !open);
    if (this.inboxOpen() && this.inboxItems().length === 0) {
      this.loadInbox();
    }
  }

  closeInbox(): void {
    this.inboxOpen.set(false);
  }

  openItem(item: InboxItem): void {
    this.inboxItems.update((rows) => rows.map((row) => (row.id === item.id ? { ...row, unread: false } : row)));
    this.inboxOpen.set(false);
    void this.router.navigateByUrl(item.href);
  }

  viewAll(): void {
    this.inboxOpen.set(false);
    void this.router.navigateByUrl(this.inboxHref());
  }

  onSearch(event: Event): void {
    event.preventDefault();
    const query = this.searchQuery().trim();
    const path = searchPath(this.auth.user()?.audience);
    void this.router.navigate([path], { queryParams: query ? { q: query } : {} });
  }

  relativeKey(at: string): string {
    const mins = Math.max(1, Math.round((Date.now() - new Date(at).getTime()) / 60000));
    if (mins < 60) {
      return 'inbox.minutesAgo';
    }
    if (mins < 60 * 24) {
      return 'inbox.hoursAgo';
    }
    return 'inbox.daysAgo';
  }

  relativeCount(at: string): number {
    const mins = Math.max(1, Math.round((Date.now() - new Date(at).getTime()) / 60000));
    if (mins < 60) {
      return mins;
    }
    if (mins < 60 * 24) {
      return Math.round(mins / 60);
    }
    return Math.round(mins / (60 * 24));
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 860) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.inboxOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmSignOut()) {
      this.cancelSignOut();
      return;
    }
    if (this.inboxOpen()) {
      this.closeInbox();
      return;
    }
    this.menuOpen.set(false);
  }

  private loadInbox(): void {
    this.api.inbox().subscribe({
      next: (rows) => this.inboxItems.set(rows),
    });
  }
}
