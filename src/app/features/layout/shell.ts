import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { SETTINGS_LINK, navLinks, portalKey, searchPath, searchPlaceholderKey } from '@core/auth/nav';
import { PlatformApi } from '@core/http/platform-api';
import { PortalNotificationItem, PortalNotificationResource } from '@core/models.platform';
import { LanguageSwitch } from '@shared/language-switch';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe, LanguageSwitch],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly api = inject(PlatformApi);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);
  readonly confirmSignOut = signal(false);
  readonly inboxOpen = signal(false);
  readonly inboxItems = signal<PortalNotificationItem[]>([]);
  readonly unreadCount = signal(0);
  private readonly nextCursor = signal<string | null>(null);
  readonly loadingMore = signal(false);
  readonly searchQuery = signal('');
  readonly settings = SETTINGS_LINK;

  readonly links = computed(() => navLinks(this.auth.user()));
  readonly portal = computed(() => {
    const audience = this.auth.user()?.audience;
    return audience === 'operator' ? null : portalKey(audience);
  });
  readonly searchKey = computed(() => searchPlaceholderKey(this.auth.user()?.audience));
  readonly hasMoreItems = computed(() => this.nextCursor() !== null);

  constructor() {
    this.loadInbox();
    this.loadUnreadCount();
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

  async openItem(item: PortalNotificationItem): Promise<void> {
    this.inboxOpen.set(false);
    if (!item.isRead) {
      this.inboxItems.update((rows) =>
        rows.map((row) => (row.notificationId === item.notificationId ? { ...row, isRead: true } : row)),
      );
      this.unreadCount.update((count) => Math.max(0, count - 1));
      try {
        await firstValueFrom(this.api.markPortalNotificationRead(item.notificationId));
      } catch {
        /* interceptor toasts the failure; the optimistic read state is a minor, harmless drift */
      }
    }
    const href = this.resolveHref(item.resource, item.workflow);
    if (href) {
      void this.router.navigate(href.path, { queryParams: href.queryParams });
    }
  }

  /** Guide v7.0 §19.5 — the feed supplies a resource type/id but no navigation URL. Map only to
   * screens this app actually has; when nothing fits (e.g. a `governedProfile` approval, which
   * has no standalone review screen), return null and just show the alert, per the guide's
   * explicit "do not invent a detail link." */
  private resolveHref(
    resource: PortalNotificationResource,
    workflow: PortalNotificationItem['workflow'],
  ): { path: string[]; queryParams?: Record<string, string> } | null {
    const audience = this.auth.user()?.audience;
    switch (resource.type) {
      case 'paymentPoint':
        if (audience === 'merchant') {
          return { path: ['/my-payment-points'] };
        }
        if (audience === 'institution') {
          return { path: ['/all-payment-points'] };
        }
        return null;
      case 'integrationClient':
        if (audience === 'merchant') {
          return { path: ['/my-integration-user'] };
        }
        if (audience === 'institution') {
          return { path: ['/integration-user'] };
        }
        return null;
      case 'notificationEndpointConfiguration':
        if (audience === 'merchant') {
          return { path: ['/notification-delivery'] };
        }
        if (audience === 'operator') {
          return { path: ['/notification-reviews'] };
        }
        return null;
      case 'notificationDelivery':
        return audience === 'operator' ? { path: ['/delivery-recovery', resource.id] } : null;
      case 'platformOperatorInvitation':
      case 'platformOperatorChange':
        return audience === 'operator' ? { path: ['/operators'], queryParams: { tab: 'requests' } } : null;
      case 'approvalRequest':
        return this.resolveApprovalWorkflowHref(workflow);
      default:
        return null;
    }
  }

  private resolveApprovalWorkflowHref(
    workflow: PortalNotificationItem['workflow'],
  ): { path: string[]; queryParams?: Record<string, string> } | null {
    switch (workflow) {
      case 'merchantOnboarding':
        return { path: ['/merchants'], queryParams: { tab: 'pending' } };
      case 'financialInstitutionOnboarding':
        return { path: ['/institutions'], queryParams: { tab: 'pending' } };
      case 'erpSystem':
        return { path: ['/erp-systems'], queryParams: { tab: 'pending' } };
      case 'integrationClient':
        return { path: ['/integration-requests'] };
      case 'notificationEndpointConfiguration':
        return { path: ['/notification-reviews'] };
      case 'platformOperator':
        return { path: ['/operators'], queryParams: { tab: 'requests' } };
      default:
        // 'governedProfile' and null: no standalone review screen exists to link to.
        return null;
    }
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) {
      return;
    }
    this.loadingMore.set(true);
    this.api.listPortalNotifications(false, cursor).subscribe({
      next: (page) => {
        this.inboxItems.update((rows) => [...rows, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
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
    this.api.listPortalNotifications(false).subscribe({
      next: (page) => {
        this.inboxItems.set(page.items);
        this.nextCursor.set(page.nextCursor);
      },
    });
  }

  private loadUnreadCount(): void {
    this.api.getPortalNotificationUnreadCount().subscribe({
      next: (result) => this.unreadCount.set(result.count),
    });
  }
}
