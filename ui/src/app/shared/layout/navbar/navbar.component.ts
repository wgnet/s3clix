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
    AfterViewInit,
    Component,
    ContentChild,
    ContentChildren,
    ElementRef,
    EventEmitter,
    HostBinding,
    Output,
    QueryList
} from '@angular/core';
import {NavbarMenuItemComponent} from "./section/menu-item/navbar-menu-item.component";
import {fromEvent} from "rxjs";
import {NavbarMenuInfoBlockComponent} from "./section/menu-info-block/navbar-menu-info-block.component";

@Component({
    selector: 'navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss'],
    standalone: false
})
export class NavbarComponent implements AfterViewInit {

    @HostBinding('class.opened') isOpened = false;

    @ContentChild('openTrigger', {read: ElementRef}) openTrigger?: ElementRef;

    @ContentChildren(NavbarMenuItemComponent, {descendants: true}) menuItems!: QueryList<NavbarMenuItemComponent>;

    @ContentChildren(NavbarMenuInfoBlockComponent, {descendants: true}) menuInfoBlocks!: QueryList<NavbarMenuInfoBlockComponent>;

    @Output()
    opened = new EventEmitter<boolean>();

    ngAfterViewInit() {
        this.updateMenuItemsIsOpenState();

        fromEvent(this.openTrigger?.nativeElement, 'click').subscribe((_event) => {
            this.isOpened = !this.isOpened;
            this.updateMenuItemsIsOpenState();
            this.opened.emit(this.isOpened);
        });
    }

    private updateMenuItemsIsOpenState() {
        if (this.menuItems?.length) {
            this.menuItems.forEach((menuItem) => {
                menuItem.setOpened(this.isOpened);
            });
        }
        if (this.menuInfoBlocks?.length) {
            this.menuInfoBlocks.forEach((menuInfoBlock) => {
                menuInfoBlock.setOpened(this.isOpened);
            });
        }
    }
}
