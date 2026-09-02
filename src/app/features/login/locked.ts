import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

@Component({
  selector: 'app-locked',
  imports: [RouterLink, TranslocoPipe, AuthScreen, BrandLockup],
  templateUrl: './locked.html',
  styleUrls: ['./auth-forms.scss', './locked.scss'],
})
export class Locked {}
