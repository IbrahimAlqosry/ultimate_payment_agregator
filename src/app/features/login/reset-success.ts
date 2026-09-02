import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

@Component({
  selector: 'app-reset-success',
  imports: [RouterLink, TranslocoPipe, AuthScreen, BrandLockup],
  templateUrl: './reset-success.html',
  styleUrl: './auth-forms.scss',
})
export class ResetSuccess {}
