import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { SETTINGS_LINK, inboxPath, navLinks, portalKey, searchPlaceholderKey } from '@core/auth/nav';
import { LanguageSwitch } from '@shared/language-switch';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe, LanguageSwitch],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);
  readonly settings = SETTINGS_LINK;

  readonly links = computed(() => navLinks(this.auth.user()));
  readonly portal = computed(() => {
    const audience = this.auth.user()?.audience;
    return audience === 'operator' ? null : portalKey(audience);
  });
  readonly searchKey = computed(() => searchPlaceholderKey(this.auth.user()?.audience));
  readonly inbox = computed(() => inboxPath(this.auth.user()?.audience));

  close(): void {
    this.menuOpen.set(false);
  }

  signOut(): void {
    this.close();
    this.auth.logout(true);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }
}
