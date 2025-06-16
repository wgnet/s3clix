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
import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {FormControl, Validators} from "@angular/forms";
import {DataServiceService} from "../../../services/data-service.service";
import {HttpErrorResponse} from "@angular/common/http";
import {valueWithoutSpacesValidator} from "../../shared/value-without-spaces-validator";
import {NotificationService} from "../../../services/notification.service";


@Component({
  selector: 'app-create-folder',
  templateUrl: './create-folder.component.html',
  styleUrls: ['./create-folder.component.scss']
})
export class CreateFolderComponent {
  folderNameFC = new FormControl('', [
    Validators.required,
    Validators.pattern('^[^/]+$'),
    valueWithoutSpacesValidator()]);

  constructor(public dialogRef: MatDialogRef<CreateFolderComponent>,
              @Inject(MAT_DIALOG_DATA) public data: string[],
              private dataService: DataServiceService,
              private notificationService: NotificationService
  ) {

  }


  createFolder() {
    const folderUrl = [this.data, this.folderNameFC.value?.trim()].join('/');

    this.dataService.createFolder(folderUrl).subscribe({
      next: () => {
        this.notificationService.showNotification(`Folder ${this.folderNameFC.value?.trim()} was successfully created!`);
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.notificationService.showNotification(`Folder ${this.folderNameFC.value?.trim()} can not be created, due to: ${err.message}`);
      }
    });
  }

}
