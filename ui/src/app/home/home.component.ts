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

import {Component, computed, effect, inject, signal} from '@angular/core';
import {IFile, ISortType, PresentationStyle} from '../models/files.model';
import {ActivatedRoute, Router} from "@angular/router";
import {PageEvent} from "@angular/material/paginator";
import {MatDialog} from "@angular/material/dialog";
import {DialogComponent} from "../dialog/dialog.component";
import {comparator} from '../shared/utility/utility';
import {CreateFolderComponent} from "../dialog/create-folder/create-folder.component";
import {UploadFilesComponent} from "../dialog/upload-files/upload-files.component";
import {
    ConfirmationDialodData,
    ConfirmDialogComponent,
    DialogType
} from "../dialog/confirm-dialog/confirm-dialog.component";
import {NotificationAction, NotificationService, NotificationType} from "../services/notification.service";
import {ComponentType} from "@angular/cdk/overlay";
import {FileAction, IFileListQueryParams} from "../models/common.model";
import {HttpErrorResponse} from "@angular/common/http";
import {rxResource, toSignal} from "@angular/core/rxjs-interop";
import {Clipboard} from "@angular/cdk/clipboard";
import {getCookie} from '../shared/utility/cookie';
import {DataServiceService} from "../services/data-service.service";
import {catchError, finalize, firstValueFrom, forkJoin, map, of} from "rxjs";


@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})

export class HomeComponent {
    protected readonly PresentationStyle = PresentationStyle;

    private readonly dataService = inject(DataServiceService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dialog = inject(MatDialog);
    private readonly notificationService = inject(NotificationService);
    private readonly clipboard = inject(Clipboard);


    readonly urlSegments = toSignal(this.route.url);
    readonly queryParams = toSignal(this.route.queryParams);

    readonly currentPath = computed(() => {
        const segments = this.urlSegments();
        return segments?.filter(seg => seg.path).map(seg => seg.path).join('/') ?? '';
    });

    readonly currentPageIndex = signal(0);
    readonly currentPageSize = signal(100);
    readonly currentSortType = signal<ISortType>({field: '', reverse: false});
    readonly currentPresentationStyle = signal<PresentationStyle>(PresentationStyle.list);

    readonly selectedBucket = signal<string>('');
    readonly activeFile = signal<string>('');

    readonly bucketsResource = rxResource({
        loader: () => this.dataService.getBuckets().pipe(map((data) => {
            return data.map((value) => {
                return {label: value, name: value};
            });
        }), catchError(() => {
            this.notificationService.showNotification(`Something went wrong, while loading buckets...😢`, NotificationType.ERROR, NotificationAction.RELOAD_PAGE);
            return of([]);
        })),
        defaultValue: []
    });

    readonly bucketsList = computed(() => this.bucketsResource.value());

    readonly filesUpdaterTrigger = signal(0);

    readonly filesResource = rxResource<IFile[], [string, number] | undefined>({
        request: () => {
            if (!this.selectBucketResource.hasValue()) return undefined;
            return [this.currentPath(), this.filesUpdaterTrigger()];
        },
        loader: ({request}) => {
            if (!request) return of([]);
            const [path] = request;
            return this.dataService.getFiles(path).pipe(
                catchError(() => {
                    this.notificationService.showNotification(`Something went wrong, while loading files...😢`, NotificationType.ERROR, NotificationAction.RELOAD_PAGE);
                    return of([]);
                })
            );
        },
        defaultValue: []
    });

    readonly selectBucketResource = rxResource({
        request: () => this.selectedBucket(),
        loader: ({request}) =>
            request ?
                this.dataService.selectBucket(request).pipe(
                    catchError(() => {
                        this.notificationService.showNotification(`Something went wrong, while selecting bucket...😢`, NotificationType.ERROR, NotificationAction.RELOAD_PAGE);
                        return of();
                    })
                )
                : of(void 0)
    });

    readonly permissionsResource = rxResource({
        request: () => this.selectBucketResource.value(),
        loader: () => forkJoin({
            deletePerm: this.dataService.canUserDeleteFiles(),
            uploadPerm: this.dataService.canUserUploadFiles()
        }).pipe(
            catchError(() => {
                this.notificationService.showNotification(`Something went wrong, while loading permissions...😢`, NotificationType.ERROR, NotificationAction.RELOAD_PAGE);
                return of({deletePerm: false, uploadPerm: false});
            })
        ),
        defaultValue: {deletePerm: false, uploadPerm: false}
    });

    readonly canUserDeleteFiles = computed(() => this.permissionsResource.value().deletePerm);
    readonly canUserUploadFiles = computed(() => this.permissionsResource.value().uploadPerm);

    readonly isLoading = computed(() => this.filesResource.isLoading());

    readonly folderList = computed(() => this.filesResource.value() ?? []);

    readonly sortedFolders = computed(() => {
        const sortType = this.currentSortType();
        const sorted = [...this.folderList()].sort((a, b) => comparator((a as any)[sortType.field], (b as any)[sortType.field]));
        return sortType.reverse ? sorted.reverse() : sorted;
    });

    readonly displayedFolders = computed(() => {
        const offset = this.currentPageIndex() * this.currentPageSize();
        return this.sortedFolders().slice(offset, offset + this.currentPageSize());
    });


    readonly hasHistory = computed(() => !!this.urlSegments()?.length);


    constructor() {
        effect(() => {
            if (this.bucketsResource.value().length && !this.selectedBucket()) {
                this.selectedBucket.set(getCookie('bucket.name', this.bucketsResource.value().at(0)?.name));
            }

        });

        effect(() => {
            const bucket = this.queryParams()?.['bucket'];
            if (bucket && bucket !== this.selectedBucket()) {
                this.selectedBucket.set(bucket);
            }
        });

        effect(() => {
            if (this.urlSegments()) {
                this.currentPageIndex.set(0);
            }
        });

        effect(() => {
            const queryParams = this.queryParams();
            const folderList = this.folderList();
            if (queryParams && queryParams['file'] && folderList.length !== 0 && this.activeFile() != queryParams['file']) {
                this.activeFile.set(queryParams['file']);
                this.openFile(queryParams['file']);
            }
        });
    }

    openFile(fileName: string) {
        const index = this.folderList().findIndex(file => file.name === fileName);
        if (index !== -1) {
            this.openViewDialog(index);
        } else if (fileName) {
            this.notificationService.showNotification(`There is no file: ${fileName}`);
            this.router.navigate([], {
                queryParams: {
                    'file': null
                },
                queryParamsHandling: 'merge'
            });
        }
    }

    async openViewDialog(index: number) {
        const dialogRef = this.dialog.open(DialogComponent, {
            panelClass: 'viewer-dialog',
            minWidth: '100vw',
            maxWidth: '100vw',
            height: '100vh',
            data: {elements: this.folderList(), index: index}
        });
        await firstValueFrom(dialogRef.afterClosed());

        this.activeFile.set('');
        await this.router.navigate(['./'], {
            relativeTo: this.route,
            queryParams: {bucket: this.selectedBucket()}
        });
    }

    goBack() {
        if (this.currentPath()) {
            const newPath: string[] = this.currentPath().split('/').slice(0, -1);
            if (newPath) {
                this.router.navigate(['/home'].concat(newPath));
            } else {
                this.router.navigate(['/home']);
            }
        }
    }

    pageHandler(event: PageEvent) {
        this.currentPageSize.set(event.pageSize);
        this.currentPageIndex.set(event.pageIndex);
    }

    setSortType(sortType: any) {
        if (sortType) {
            this.currentSortType.set(sortType);
        }
    }

    selectBucket(bucket: string) {
        this.selectedBucket.set(bucket);
        this.router.navigate(['/home']);
    }

    setPresentationStyle(value: PresentationStyle) {
        this.currentPresentationStyle.set(value);
    }

    handleSelectedElement(item: IFile) {
        if (item.folder) {
            const pathParts = item.path.split('/').filter(element => !!element);
            this.router.navigate(['/home'].concat(pathParts), {
                queryParams: {
                    bucket: this.selectedBucket()
                }
            });
        } else {
            const params: IFileListQueryParams = {
                file: item.name,
                bucket: this.selectedBucket()
            };
            this.router.navigate(['./'], {
                queryParams: params,
                relativeTo: this.route
            });
        }
    }

    handleMenuButtonClick(event: { item: IFile, action: FileAction }) {
        switch (event.action) {
            case FileAction.delete:
                this.deleteFile(event.item);
                break;

            case FileAction.download:
                this.downloadFile(event.item);
                break;

            case FileAction.copyLink:
                this.copyLinkToClipboard(event.item);
                break;

            case FileAction.copyCdnLink:
                this.copyCdnLinkToClipboard(event.item);
                break;

            case FileAction.deleteFolder:
                this.deleteFolder(event.item);
                break;
        }
    }

    onCreateFolderButton() {
        if (!this.canUserUploadFiles()) {
            this.notificationService.showNotification("Sorry, but you don't have the permission to create folder");
            return;
        }
        return this.openActionDialog(CreateFolderComponent);
    }

    onUploadFileButton() {
        if (!this.canUserUploadFiles()) {
            this.notificationService.showNotification("Sorry, but you don't have the permission to upload files");
            return;
        }
        return this.openActionDialog(UploadFilesComponent);
    }

    async openActionDialog(component: ComponentType<any>) {
        const dialogRef = this.dialog.open(component, {
            panelClass: 'action-dialog',
            position: {top: '10vh'},
            minWidth: '20vw',
            maxWidth: '50vw',
            data: this.currentPath()
        });

        const result = await firstValueFrom(dialogRef.afterClosed());

        if (result) {
            this.filesUpdaterTrigger.update(v => v + 1);
        }
    }

    downloadFile(file: IFile) {
        const encodedFilePath = encodeURIComponent(file.path);
        window.open(`/api/download/${encodedFilePath}`, '_blank');
    }

    copyLinkToClipboard(file: IFile) {
        const currentUrl = this.router.url.split('?file=')[0];
        const queryParams = `&file=${encodeURIComponent(file.name)}`;
        const fullUrl = `${window.location.origin}/#${currentUrl}${queryParams}`;
        this.clipboard.copy(fullUrl);
        this.notificationService.showNotification('Share link has been copied into clipboard');
    }

    copyCdnLinkToClipboard(file: IFile) {
        if (file.cdn_url) {
            this.clipboard.copy(file.cdn_url);
            this.notificationService.showNotification('CDN link has been copied into clipboard');
        } else {
            this.notificationService.showNotification('Oooops. There is nothing to copy');
        }
    }

    async deleteFolder(folder: IFile) {
        if (!this.canUserDeleteFiles()) {
            return;
        }

        const confirmed = await this.showConfirmationDialog({
            dialogText: 'This action will result in the complete deletion of all contents in this folder.',
            dialogType: DialogType.WARNING
        });

        if (!confirmed) return;

        this.dataService.deleteFolder(folder.path).pipe(
            finalize(() => this.filesUpdaterTrigger.update(v => v + 1)))
            .subscribe({
                next: () => {
                    this.notificationService.showNotification(`The folder ${folder.name} was successfully deleted!`);
                },
                error: (err: HttpErrorResponse) => {
                    this.notificationService.showNotification(`The folder ${folder.name} can not be deleted, due to: ${err.message}`);
                }
            });
    }

    async deleteFile(file: IFile) {
        if (!this.canUserDeleteFiles()) {
            return;
        }

        const confirmed = await this.showConfirmationDialog({
            dialogText: 'This file will be permanently deleted.',
            dialogType: DialogType.WARNING
        });

        if (!confirmed) return;

        this.dataService.deleteFile(file.path).pipe(
            finalize(() => this.filesUpdaterTrigger.update(v => v + 1)))
            .subscribe({
                next: () => {
                    this.notificationService.showNotification(`File ${file.name} was successfully deleted!`);
                },
                error: (err: HttpErrorResponse) => {
                    this.notificationService.showNotification(`File ${file.name} can not be deleted, due to: ${err.message}`);
                }
            });
    }

    async showConfirmationDialog(data?: ConfirmationDialodData) {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            panelClass: 'action-dialog',
            position: {top: '10.5vh'},
            maxWidth: '370px',
            minWidth: '370px',
            height: '200px',
            data
        });

        return firstValueFrom(dialogRef.afterClosed());
    }
}
