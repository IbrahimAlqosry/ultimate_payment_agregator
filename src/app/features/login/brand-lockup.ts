import { Component } from '@angular/core';

@Component({
  selector: 'app-brand-lockup',
  template: `
    <div class="brand-lockup">
      <div class="logo-row">
        <img
          class="flag-bars"
          src="/brand/flag-bars.svg"
          width="52.923"
          height="29.116"
          alt=""
        />
        <p class="wordmark">
          <strong>Ultimate</strong>
          <span>pay</span>
        </p>
      </div>
      <p class="slogan">لا نبيع خدمة، بل نبني مستقبلاً</p>
    </div>
  `,
  styles: `
    .brand-lockup {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .logo-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .flag-bars {
      width: 52.923px;
      height: 29.116px;
      display: block;
      flex-shrink: 0;
    }
    .wordmark {
      display: flex;
      align-items: baseline;
      gap: 4px;
      font-size: 24px;
      line-height: 1.2;
      white-space: nowrap;
    }
    .wordmark strong {
      font-weight: 800;
      color: #1c1c1d;
    }
    .wordmark span {
      font-weight: 800;
      color: #1fa64d;
    }
    .slogan {
      margin: 0;
      font-size: 10px;
      font-weight: 500;
      color: #7e7676;
      text-align: center;
      line-height: 1.2;
    }
  `,
})
export class BrandLockup {}
