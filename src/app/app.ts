import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HttpProgress } from '@shared/http-progress';
import { ToastHost } from '@shared/toast-host';

@Component({
  imports: [RouterOutlet, TranslocoPipe, HttpProgress, ToastHost],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
