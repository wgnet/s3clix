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
import {ViewComponent} from "./view/view.component";
import {ItemComponent} from "./item/item.component";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {TrimEndSlashPipe} from "../trim-end-slash.pipe";
import {ExtensionExtractorPipe} from "../extension-extractor.pipe";
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {BytesToSizePipe} from "../bytes-to-size.pipe";
import {ShortenLongTextPipe} from "../shorten-long-text.pipe";
import {MatSortModule} from "@angular/material/sort";
import {MatMenuModule} from "@angular/material/menu";
import {GlassHoverDirective} from "../glass-hover.directive";


@NgModule({
    declarations: [
        ViewComponent,
        ItemComponent,
        TrimEndSlashPipe,
        ExtensionExtractorPipe,
        BytesToSizePipe,
        ShortenLongTextPipe
    ],
    exports: [
        ViewComponent,
        ItemComponent,
        ExtensionExtractorPipe,
        TrimEndSlashPipe

    ],
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule,
        MatSortModule,
        MatMenuModule,
        GlassHoverDirective
    ]
})
export class ItemsViewModule {
}
