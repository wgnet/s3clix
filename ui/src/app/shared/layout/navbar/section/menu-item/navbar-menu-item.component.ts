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

import {
    Component,
    ContentChild,
    ElementRef,
    HostBinding,
    TemplateRef,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import {SubMenuComponent} from "../sub-menu/sub-menu.component";
import {PopupService} from "../../../../../services/popup.service";


@Component({
    selector: 'menu-item',
    templateUrl: './navbar-menu-item.component.html',
    styleUrls: ['./navbar-menu-item.component.scss'],
    standalone: false
})
export class NavbarMenuItemComponent {

    expanded = false;

    @ContentChild(SubMenuComponent)
    subMenuTemplate: SubMenuComponent | null = null;

    @ViewChild('popupContent', {read: TemplateRef})
    popupContent!: TemplateRef<any>;

    @HostBinding('class.opened') isOpened = false;

    @HostBinding('class.sub-menu-expanded') isExpanded = false;

    constructor(private elementRef: ElementRef,
                private viewContainerRef: ViewContainerRef,
                private popupService: PopupService) {

    }

    onClick() {
        if (this.subMenuTemplate) {
            if (this.isOpened) {
                this.expanded = !this.expanded;
            } else {
                this.popupService.showPopup(this.elementRef, this.viewContainerRef, this.popupContent, true, [{
                    originX: 'end',
                    originY: 'top',
                    overlayX: 'start',
                    overlayY: 'top'
                }]);
            }
            this.isExpanded = this.expanded;
        }
    }

    setOpened(isOpened: boolean) {
        this.isOpened = isOpened;
        this.expanded = false;
    }
}
