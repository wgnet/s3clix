/**
 Copyright 2025 Wargaming.Net

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
**/

import {Directive, ElementRef, HostListener, Injector, Input, ViewContainerRef} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {PopupService} from "../../../../services/popup.service";
import {AppMenuComponent} from "./app-switcher/app-menu.component";
import {OverlayRef} from "@angular/cdk/overlay";
import {APPS_DATA, IAppsCatalog} from "../../interfaces";

@Directive({
    selector: '[appSwitcher]',
    standalone: false
})
export class AppSwitcherDirective {

    appsCatalog: IAppsCatalog | null = null;

    @Input()
    set appsURL(url: string | null) {
        if (url) {
            this.httpClient.get<IAppsCatalog>(url).subscribe((appsCatalog: IAppsCatalog) => {
                this.appsCatalog = appsCatalog;
            });
        }
    }

    overlayRef!: OverlayRef | null;

    @HostListener('click')
    onClick() {
        if (!this.popupService.isPopupShown) {
            this.overlayRef = this.popupService.showPopup(
                this.elementRef,
                this.viewContainerRef,
                AppMenuComponent,
                true,
                [{
                    originX: 'end',
                    originY: 'top',
                    overlayX: 'start',
                    overlayY: 'top',
                    offsetX: 16,
                    offsetY: -9
                }],
                Injector.create({
                    providers: [{provide: APPS_DATA, useValue: this.appsCatalog}]
                })
            );
        } else {
            this.popupService.hidePopup(this.overlayRef);
            this.overlayRef = null;
        }

    }

    constructor(private elementRef: ElementRef,
                private httpClient: HttpClient,
                private viewContainerRef: ViewContainerRef,
                private popupService: PopupService) {
    }

}
