import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageSwitch } from '@shared/language-switch';

@Component({
  selector: 'app-status',
  imports: [RouterLink, TranslocoPipe, LanguageSwitch],
  templateUrl: './status.html',
  styleUrl: './status.scss',
})
export class Status {
  readonly code = input<401 | 404 | 501 | 503>(404);
}
