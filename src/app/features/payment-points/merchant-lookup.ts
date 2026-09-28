import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, defer, EMPTY, expand, from, map, mergeMap, Observable, of, reduce, shareReplay } from 'rxjs';
import { PlatformApi } from '@core/http/platform-api';
import { MerchantApplicationDetails } from '@core/models.platform';

/** A PaymentPoint only carries `merchantId`. The one endpoint that returns merchant details by ID
 * is `GET /merchant-onboarding/applications/{applicationId}` — assumed here to share the
 * merchant's ID, and not documented as open to FI sessions. So every lookup is best-effort:
 * `null` means "unknown" and the screen falls back to showing the raw ID. The first 403 turns
 * lookups off for the rest of the session so a queue page doesn't fire a request per row that
 * the FI isn't allowed to make. Results (hits, 403s and 404s) are cached; transient failures
 * aren't, so a later visit can retry. */
@Injectable({ providedIn: 'root' })
export class MerchantLookup {
  private readonly api = inject(PlatformApi);
  private readonly cache = new Map<string, Observable<MerchantApplicationDetails | null>>();
  private forbidden = false;
  private erpNames$?: Observable<ReadonlyMap<string, string>>;

  merchant(merchantId: string): Observable<MerchantApplicationDetails | null> {
    return defer(() => {
      if (this.forbidden) {
        return of(null);
      }
      let cached = this.cache.get(merchantId);
      if (!cached) {
        cached = this.api.getMerchantApplication(merchantId, { silent: true }).pipe(
          catchError((err: HttpErrorResponse) => {
            if (err.status === 403) {
              this.forbidden = true;
            } else if (err.status !== 404) {
              this.cache.delete(merchantId);
            }
            return of(null);
          }),
          shareReplay(1),
        );
        this.cache.set(merchantId, cached);
      }
      return cached;
    });
  }

  /** Resolves several IDs, four at a time, emitting `[merchantId, details]` as each settles. The
   * 403 cut-off above means a list the FI can't enrich costs a handful of failed requests, not
   * one per row. */
  many(merchantIds: Iterable<string>): Observable<readonly [string, MerchantApplicationDetails | null]> {
    return from(new Set(merchantIds)).pipe(
      mergeMap((id) => this.merchant(id).pipe(map((merchant) => [id, merchant] as const)), 4),
    );
  }

  /** ERP ID → display name, from the public choices list (all pages). Empty on failure. */
  erpNames(): Observable<ReadonlyMap<string, string>> {
    this.erpNames$ ??= this.api.getErpChoices({ pageSize: 50 }).pipe(
      expand((page) => (page.nextCursor ? this.api.getErpChoices({ pageSize: 50, cursor: page.nextCursor }) : EMPTY)),
      reduce((names, page) => {
        for (const choice of page.items) {
          names.set(choice.erpSystemId, choice.systemName);
        }
        return names;
      }, new Map<string, string>()),
      map((names): ReadonlyMap<string, string> => names),
      catchError(() => {
        this.erpNames$ = undefined;
        return of(new Map<string, string>());
      }),
      shareReplay(1),
    );
    return this.erpNames$;
  }
}
