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
import {BrowserModule} from '@angular/platform-browser';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatIconModule} from "@angular/material/icon";
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {NotFoundPageComponent} from "./not-found-page/not-found-page.component";
import {MatCardModule} from "@angular/material/card";
import {HashLocationStrategy, LocationStrategy} from "@angular/common";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {BreadcrumbsComponent} from './breadcrumbs/breadcrumbs.component';
import {MatButtonModule} from "@angular/material/button";
import {CreateFolderComponent} from './dialog/create-folder/create-folder.component';
import {MatDialog, MatDialogModule, MatDialogRef} from "@angular/material/dialog";
import {MatInputModule} from "@angular/material/input";
import {ReactiveFormsModule} from "@angular/forms";
import {UploadFilesComponent} from './dialog/upload-files/upload-files.component';
import {ConfirmDialogComponent} from './dialog/confirm-dialog/confirm-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    NotFoundPageComponent,
    BreadcrumbsComponent,
    CreateFolderComponent,
    UploadFilesComponent,
    ConfirmDialogComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatTooltipModule,
    MatIconModule,
    HttpClientModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  providers: [
    HttpClient,
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy,
    },

    MatDialog,
    {provide: MatDialogRef, useValue: {}}

  ],

  bootstrap: [AppComponent]
})
export class AppModule {
}
