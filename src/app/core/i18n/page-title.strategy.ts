import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, map, Subject, switchMap } from 'rxjs';

/**
 * Resolves `Route.title` translation keys (and status `data.code`) into
 * `Page · Aggregator Platform`. Stays in sync with Transloco language changes.
 */
@Injectable()
export class TranslocoTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private readonly key$ = new Subject<string>();

  constructor() {
    super();
    this.key$
      .pipe(
        switchMap((key) =>
          combineLatest({
            page: this.transloco.selectTranslate(key),
            brand: this.transloco.selectTranslate('brand.name'),
          }).pipe(map((parts) => ({ key, ...parts }))),
        ),
      )
      .subscribe(({ key, page, brand }) => {
        this.title.setTitle(key === 'brand.name' ? brand : `${page} · ${brand}`);
      });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    const code = leafData(snapshot.root)['code'];
    const key = routeTitle ?? (typeof code === 'number' ? `status.${code}.title` : 'brand.name');
    this.key$.next(key);
  }
}

function leafData(route: ActivatedRouteSnapshot): Record<string, unknown> {
  let current = route;
  while (current.firstChild) {
    current = current.firstChild;
  }
  return current.data;
}
