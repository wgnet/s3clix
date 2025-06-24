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

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {PageLayoutComponent} from "./page-layout.component";
import {PageHeaderComponent} from "./header/page-header.component";
import {NavbarComponent} from "./navbar/navbar.component";
import {NavbarSectionComponent} from "./navbar/section/navbar-section.component";
import {NavbarMenuItemComponent} from "./navbar/section/menu-item/navbar-menu-item.component";
import {RouterOutlet} from "@angular/router";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {NavbarMenuInfoBlockComponent} from './navbar/section/menu-info-block/navbar-menu-info-block.component';
import {PageTitleComponent} from "./page-title/page-title.component";
import {PortalModule} from "@angular/cdk/portal";
import {AppMenuComponent} from './navbar/section/app-switcher/app-menu.component';
import {MatCardModule} from "@angular/material/card";
import {MatInputModule} from "@angular/material/input";
import {MatListModule} from "@angular/material/list";
import {CdkTreeModule} from "@angular/cdk/tree";
import {AppSwitcherDirective} from './navbar/section/app-switcher.directive';
import {ReactiveFormsModule} from "@angular/forms";
import {
    AppMenuSearchResultsComponent
} from './navbar/section/app-switcher/app-menu-search-results/app-menu-search-results.component';
import {SubMenuComponent} from './navbar/section/sub-menu/sub-menu.component';
import {GlassHoverDirective} from "../glass-hover.directive";


@NgModule({
    declarations: [
        PageLayoutComponent,
        PageHeaderComponent,
        PageTitleComponent,
        NavbarComponent,
        NavbarSectionComponent,
        NavbarMenuItemComponent,
        NavbarMenuInfoBlockComponent,
        AppMenuComponent,
        AppSwitcherDirective,
        AppMenuSearchResultsComponent,
        SubMenuComponent
    ],
    imports: [
        CommonModule,
        RouterOutlet,
        MatIconModule,
        MatTooltipModule,
        PortalModule,
        MatCardModule,
        MatInputModule,
        MatListModule,
        CdkTreeModule,
        ReactiveFormsModule,
        GlassHoverDirective
    ],
    exports: [
        PageLayoutComponent,
        NavbarComponent,
        NavbarSectionComponent,
        NavbarMenuItemComponent,
        PageHeaderComponent,
        PageTitleComponent,
        NavbarMenuInfoBlockComponent,
        AppMenuComponent,
        AppSwitcherDirective,
        SubMenuComponent
    ]
})
export class LayoutModule {

}
