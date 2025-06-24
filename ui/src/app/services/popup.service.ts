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

import {ElementRef, Injectable, Injector, TemplateRef, ViewContainerRef} from '@angular/core';
import {ComponentType, ConnectedPosition, Overlay, OverlayRef} from "@angular/cdk/overlay";
import {ComponentPortal, TemplatePortal} from "@angular/cdk/portal";


@Injectable({
    providedIn: 'root'
})
export class PopupService {

    overlayRef: OverlayRef | null = null;
    portal: ComponentPortal<any> | TemplatePortal | null = null;
    attachedTo: ElementRef | null = null;

    constructor(private overlay: Overlay) {
    }

    showPopup(attachTo: ElementRef,
              viewContainerRef: ViewContainerRef,
              instanceRef: TemplateRef<unknown> | ComponentType<any>,
              hasBackdrop = false,
              overlayPositions: ConnectedPosition[] | null = null,
              injector: Injector | null = null) {
        if (attachTo !== this.attachedTo) {
            this.hidePopup();
        }
        if (!this.overlayRef) {
            const positionStrategy = this.overlay.position()
                .flexibleConnectedTo(attachTo)
                .withPositions(
                    overlayPositions ?? [{
                        originX: 'start',
                        originY: 'bottom',
                        overlayX: 'start',
                        overlayY: 'top'
                    }, {
                        originX: 'center',
                        originY: 'bottom',
                        overlayX: 'center',
                        overlayY: 'top'
                    }, {
                        originX: 'end',
                        originY: 'center',
                        overlayX: 'start',
                        overlayY: 'center'
                    }]);

            this.attachedTo = attachTo;
            this.overlayRef = this.overlay.create({
                positionStrategy: positionStrategy,
                scrollStrategy: this.overlay.scrollStrategies.reposition(),
                disposeOnNavigation: true,
                hasBackdrop: hasBackdrop,
                backdropClass: 'transparent-backdrop'
            });
            if (instanceRef instanceof TemplateRef) {
                this.portal = new TemplatePortal(instanceRef, viewContainerRef, null, injector ?? undefined);
            } else {
                this.portal = new ComponentPortal(instanceRef, viewContainerRef, injector);
            }

            this.overlayRef.attach(this.portal);
        }
        if (hasBackdrop) {
            this.overlayRef.backdropClick().subscribe(() => {
                this.dispose();
            });
        }
        return this.overlayRef;
    }

    public get isPopupShown() {
        return !!this.overlayRef;
    }

    public hidePopup(overlayRef: OverlayRef | null = null) {
        if (!overlayRef || this.overlayRef == overlayRef) {
            this.dispose();
        }
    }

    private dispose() {
        if (!!this.overlayRef) {
            this.overlayRef.dispose();
            this.overlayRef = null;
        }
    }
}
