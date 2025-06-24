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

import {Component, Inject, OnDestroy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {DataServiceService} from "../../services/data-service.service";
import {HttpErrorResponse, HttpEvent, HttpEventType} from "@angular/common/http";
import {ConfirmDialogComponent} from "../confirm-dialog/confirm-dialog.component";
import {Subscription} from "rxjs";
import {NotificationService} from "../../services/notification.service";

@Component({
    selector: 'app-upload-files',
    templateUrl: './upload-files.component.html',
    styleUrls: ['./upload-files.component.scss'],
    standalone: false
})
export class UploadFilesComponent implements OnDestroy {

    filesToUpload: File[] = [];
    uploadStatus: { [key: string]: { uploading: boolean, success: boolean, failed: boolean, progress: number } } = {};
    allSubscriptions = new Subscription();
    disableUploadButton: boolean = true;
    uploadProcess: boolean = false;
    overtimeCoefficient: number = 1; // needed to make upload status freeze on 99 percent instead of 100


    constructor(public dialogRef: MatDialogRef<UploadFilesComponent>,
                @Inject(MAT_DIALOG_DATA) public data: string[],
                private dataService: DataServiceService,
                private dialog: MatDialog,
                private notificationService: NotificationService) {

    }

    ngOnDestroy() {
        this.allSubscriptions.unsubscribe();
    }

    handleFileInput(event: any): void {
        const files: FileList = event.target.files;
        this.filesToUpload = Array.from(files);
        this.disableUploadButton = false;
        this.initFilesUploadStatus();
    }

    uploadFiles() {
        const files = [...this.filesToUpload];
        this.uploadProcess = true;
        this.disableUploadButton = true;
        this.uploadFileByFile(files);
    }

    uploadFileByFile(files: File[]) {
        if (!files.length) {
            this.resetFileInput();
            this.uploadProcess = false;
            this.dialogRef.close(true);
            return;
        } else {
            const file: File = files.shift()!;
            const fileURL = [this.data, file.name].join('/');

            this.uploadStatus[file.name] = {uploading: true, success: false, failed: false, progress: 0};

            const subscription = this.dataService.uploadFile(fileURL, file).subscribe({
                next: (event: HttpEvent<any>) => {
                    if (event.type === HttpEventType.UploadProgress) {
                        this.uploadStatus[file.name].progress = Math.round((100 * event.loaded) / event.total!) - this.overtimeCoefficient;
                    } else if (event.type === HttpEventType.Response) {
                        this.uploadStatus[file.name] = {uploading: false, success: true, failed: false, progress: 0};
                        this.notificationService.showNotification(`${file.name} was successfully uploaded!`);
                        this.uploadFileByFile(files);
                    }

                },
                error: (err: HttpErrorResponse) => {
                    this.uploadStatus[file.name] = {uploading: false, success: false, failed: true, progress: 0};
                    this.notificationService.showNotification(`${file.name} can not be uploaded, due to: ${err.message}`);
                    this.uploadFileByFile(files);
                }
            });
            this.allSubscriptions.add(subscription);
        }
    }

    initFilesUploadStatus() {
        this.filesToUpload.forEach((file: File) => {
            this.uploadStatus[file.name] = {uploading: false, success: false, failed: false, progress: 0};
        });
    }

    resetFileInput() {
        const fileInput = document.getElementById('inputGroupFile') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
        this.disableUploadButton = true;
    }

    openConfirmDialog() {
        const confirmationDialogRef = this.dialog.open(ConfirmDialogComponent, {
            position: {top: '10.5vh'},
            maxWidth: '370px',
            minWidth: '370px',
            height: '200px'
        });
        confirmationDialogRef.afterClosed().subscribe((result: boolean) => {
                if (result) {
                    this.dialogRef.close(true);
                }
            }
        );
    }

    onCancel() {
        this.uploadProcess ?
            this.openConfirmDialog()
            : this.dialogRef.close(false);

    }


}
