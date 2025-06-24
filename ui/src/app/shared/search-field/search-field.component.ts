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

import {Component, OnInit, signal} from '@angular/core';
import {FormControl, Validators} from "@angular/forms";
import {debounce, filter, interval, tap} from "rxjs";
import {environment} from "../../../environments/environment";
import {DataServiceService} from "../../services/data-service.service";
import {IFile} from "../../models/files.model";
import {NotificationAction, NotificationService, NotificationType} from "../../services/notification.service";
import {IFileListQueryParams} from "../../models/common.model";
import {Router} from "@angular/router";

@Component({
    selector: 'app-search-field',
    templateUrl: './search-field.component.html',
    styleUrls: ['./search-field.component.scss'],
    standalone: false
})
export class SearchFieldComponent implements OnInit {

    protected readonly minSearchTermLength = environment.minSearchTermLength;

    searchFormControl = new FormControl<string>('',
        Validators.minLength(environment.minSearchTermLength)
    );

    fileListSignal = signal<IFile[]>([]);
    dataLoading = false;

    constructor(private dataService: DataServiceService,
                private router: Router,
                private notificationService: NotificationService) {
    }

    ngOnInit(): void {
        this.searchFormControl.valueChanges.pipe(
            filter(() => this.searchFormControl.valid),
            tap(() => this.dataLoading = true),
            debounce(() => interval(environment.beSearchDebounceInterval))
        ).subscribe((searchValue) => {
            if (searchValue) {
                this.applySearch(searchValue);
            } else {
                this.fileListSignal.set([]);
                this.dataLoading = false;
            }
        });
    }

    applySearch(searchValue: string) {
        this.dataService.searchFiles(searchValue).subscribe({
            next: (files: IFile[]) => {
                this.fileListSignal.set(files);
                this.dataLoading = false;
            }, error: () => {
                this.notificationService.showNotification(`Something went wrong... 😢`, NotificationType.ERROR, NotificationAction.RELOAD_PAGE);
            }
        });
    }

    closeSearchPanel() {
        this.searchFormControl.reset();
        this.fileListSignal.set([]);
    }

    openFile(item: IFile) {
        const pathParts = item.path.split('/').filter(element => !!element).slice(0, -1);
        const params: IFileListQueryParams = {
            file: item.name
        };
        this.router.navigate(['/home'].concat(pathParts), {
            queryParams: params
        });
    }

}
