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
import {HomeRoutingModule} from './home-routing.module';
import {HomeComponent} from "./home.component";
import {ItemsViewModule} from "../shared/items-view/items-view.module";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatButtonModule} from "@angular/material/button";
import {DialogComponent} from "../dialog/dialog.component";
import {MatDialog, MatDialogModule, MatDialogRef} from "@angular/material/dialog";
import {NgxExtendedPdfViewerModule} from "ngx-extended-pdf-viewer";
import {VideoComponent} from "../dialog/viewers/video/video.component";
import {ImageComponent} from "../dialog/viewers/image/image.component";
import {UnsupportedFormatComponent} from "../dialog/viewers/unsupported-format/unsupported-format.component";
import {MatIconModule} from "@angular/material/icon";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {EncodeURIPipe} from "../shared/encode-uri.pipe";
import {SearchFieldComponent} from "../shared/search-field/search-field.component";
import {ReactiveFormsModule} from "@angular/forms";
import {MatSelectModule} from '@angular/material/select';


@NgModule({
  declarations: [
    HomeComponent,
    DialogComponent,
    VideoComponent,
    ImageComponent,
    UnsupportedFormatComponent,
    EncodeURIPipe,
    SearchFieldComponent,
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    ItemsViewModule,
    MatPaginatorModule,
    MatButtonModule,
    MatDialogModule,
    NgxExtendedPdfViewerModule,
    MatIconModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    MatSelectModule,
  ],
  exports: [],
  providers: [
    MatDialog,
    {provide: MatDialogRef, useValue: {}}
  ]
})
export class HomeModule {
}
