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
import {Component, computed, effect, OnInit, signal} from '@angular/core';
import {DataServiceService} from '../../services/data-service.service'
import {IFile, ISortType} from '../models/files.model'
import {ActivatedRoute, Router} from "@angular/router";
import {PageEvent} from "@angular/material/paginator";
import {MatDialog} from "@angular/material/dialog";
import {DialogComponent} from "../dialog/dialog.component";
import {comparator} from '../shared/utility/utility';
import {CreateFolderComponent} from "../dialog/create-folder/create-folder.component";
import {UploadFilesComponent} from "../dialog/upload-files/upload-files.component";
import {ConfirmationDialodData, ConfirmDialogComponent, DialogType} from "../dialog/confirm-dialog/confirm-dialog.component";
import {NotificationAction, NotificationService, NotificationType} from "../../services/notification.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ComponentType} from "@angular/cdk/overlay";
import {FileAction, IFileListQueryParams} from "../models/common.model";
import {HttpErrorResponse} from "@angular/common/http";
import {toSignal} from "@angular/core/rxjs-interop";
import {Clipboard} from "@angular/cdk/clipboard";
import {getCookie} from '../shared/utility/cookie';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit {
  currentPath: string = '*';

  folderListSignal = signal<IFile[]>([]);
  currentPageIndex = signal(0);
  currentPageSize = signal(100);
  currentSortType = signal<ISortType>({field: '', reverse: false});
  bucketsList = signal<{ name: string, label: string }[]>([]);
  activeBucket = signal<string>('');
  canUserUploadFiles = signal(false);
  canUserDeleteFiles = signal(false);
  hasHistory = signal(false);

  sortedList = computed(() => {
    const sortType = this.currentSortType();
    const sortedList = this.folderListSignal().sort((a, b) => {
      return comparator((a as any)[sortType.field], (b as any)[sortType.field])
    })
    return (sortType.reverse) ? sortedList.reverse() : sortedList

  })

  displayed = computed(() => {
    const pageIndex = this.currentPageIndex();
    const pageSize = this.currentPageSize()
    const offset = pageIndex * pageSize;
    const limit = offset + pageSize;
    return this.sortedList().slice(offset, limit);
  })

  urlSegments = toSignal(this.route.url);

  queryParams = toSignal(this.route.queryParams);

  isLoadingFilesByBucket = signal(this.queryParams()?.['bucket'] && this.queryParams()?.['bucket'] != getCookie("bucket.name", null));

  constructor(public dataService: DataServiceService,
              private route: ActivatedRoute,
              private router: Router,
              private dialog: MatDialog,
              private notificationService: NotificationService,
              private snackBar: MatSnackBar,
              private clipboard: Clipboard) {
    effect(() => {
      if (this.isLoadingFilesByBucket()) {
        return;
      }

      this.parsingQueryParams();
    }, {allowSignalWrites: true});
  }

  parsingQueryParams() {
    const queryParams = this.queryParams();
    const urlSegments = this.urlSegments();
    this.hasHistory.set(!!urlSegments?.length);

    if (urlSegments) {
      const assumedPath = this.getAssumedPath();
      if (this.currentPath !== assumedPath) {
        this.currentPath = assumedPath;
        this.loadFiles();
        this.currentPageIndex.set(0);
      }
    }

    const folderList = this.folderListSignal();
    if (queryParams && folderList.length !== 0) {
      this.openFile(queryParams['file']);
    }
  }

  getAssumedPath() {
    const urlSegments = this.urlSegments();
    if (urlSegments) {
      return urlSegments.filter(segment => !!segment.path).map(segment => segment.path).join('/');
    }

    return '';
  }

  openFile(fileName: string) {
    const index = this.folderListSignal().findIndex(file => file.name === fileName);
    if (index !== -1) {
      this.openViewDialog(index);
    } else if (fileName) {
      this.notificationService.showNotification(`There is no file: ${fileName}`)
      this.router.navigate([], {
        queryParams: {
          'file': null,
        },
        queryParamsHandling: 'merge'
      })
    }
  }

  checkUserPermissions() {
    this.canUserDeleteFiles.set(false); // by default
    this.canUserUploadFiles.set(false); // by default

    this.dataService.canUserDeleteFiles().subscribe(value => {
      this.canUserDeleteFiles.set(value);
    });

    this.dataService.canUserUploadFiles().subscribe(value => {
      this.canUserUploadFiles.set(value);
    });
  }

  ngOnInit() {
    this.loadBuckets();
    const queryParams = this.queryParams();
    if (queryParams?.['bucket']) {
      this.activeBucket.set(queryParams['bucket']);
      this.isLoadingFilesByBucket.set(true);
      this.dataService.selectBucket(queryParams['bucket']).subscribe({
        next: () => {
          this.checkUserPermissions();
          this.currentPath = this.getAssumedPath();
          this.loadFiles();
        },
        error: () => {
          this.router.navigate(['/home'])
          this.notificationService.showNotification(`Something went wrong, while loading files...😢`, NotificationType.ERROR, NotificationAction.RELOAD_PAGE);
        },
        complete: () => {
          this.isLoadingFilesByBucket.set(false);
        },
      });
    } else {
      this.checkUserPermissions();
    }

    this.notificationService.getStream().subscribe(notification => {
      const actionMessage = (notification.action === NotificationAction.DISMISS) ? 'Dismiss' : 'Reload page';
      const duration = (notification.action === NotificationAction.DISMISS) ? 3000 : 6000;

      const snackBarRef = this.snackBar.open(notification.message, actionMessage, {
        duration: duration,
        verticalPosition: 'top',
        horizontalPosition: 'end'
      });

      snackBarRef.afterDismissed().subscribe(() => {
        if (notification.action === NotificationAction.RELOAD_PAGE)
          window.location.reload();
      })
    });
  }

  private loadFiles() {
    this.folderListSignal.set([])
    this.dataService.getFiles(this.currentPath).subscribe({
      next: (items: IFile[]) => {
        this.folderListSignal.set(items);
      }, 
      error: () => {
        this.notificationService.showNotification(`Something went wrong, while loading files...😢`, NotificationType.ERROR, NotificationAction.RELOAD_PAGE);
      }
    })
  }

  private loadBuckets() {
    this.dataService.getBuckets().subscribe({
      next: (data) => {
        const bucketsList = data.map((value) => {
          return { label: value, name: value };
        });
        this.bucketsList.set(bucketsList);
        this.activeBucket.set(getCookie('bucket.name', data.at(0)));
      },
      error: (e) => {
        this.notificationService.showNotification(`Something went wrong, while loading buckets...😢`, NotificationType.ERROR, NotificationAction.RELOAD_PAGE);
      },
    });
  }

  goBack() {
    if (this.currentPath) {
      const newPath: string[] = this.currentPath.split('/').slice(0, -1);
      if (newPath) {
        this.router.navigate(['/home'].concat(newPath));
      } else {
        this.router.navigate(['/home'])
      }
    }
  }

  pageHandler(event: PageEvent) {
    this.currentPageSize.set(event.pageSize);
    this.currentPageIndex.set(event.pageIndex);
  }

  handleSelectedElement(item: IFile) {
    if (item.folder) {
      const pathParts = item.path.split('/').filter(element => !!element);
      this.router.navigate(['/home'].concat(pathParts), {
        queryParams: {
          bucket: this.activeBucket(),
        }
      });
      this.currentPageIndex.set(0);
    } else {
      const params: IFileListQueryParams = {
        file: item.name,
        bucket: this.activeBucket(),
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
        this.deleteFile(event.item)
        break;

      case FileAction.download:
        this.downloadFile(event.item)
        break;

      case FileAction.copyLink:
        this.copyLinkToClipboard(event.item)
        break;

      case FileAction.copyCdnLink:
        this.copyCdnLinkToClipboard(event.item)
        break;

      case FileAction.deleteFolder:
        this.deleteFolder(event.item)
        break;
    }
  }

  openViewDialog(index: number) {
    this.dialog.open(DialogComponent, {
      panelClass: "custom-dialog-container",
      maxWidth: '100vw',
      maxHeight: '100vh',
      data: {elements: this.displayed(), index: index}
    }).afterClosed().subscribe(() => {
        this.router.navigate(['./'], {
          relativeTo: this.route,
          queryParams: { bucket: this.activeBucket() },
        });
      }
    );
  }

  setSortType(sortType: any) {
    if (sortType) {
      this.currentSortType.set(sortType);
    }
  }

  onCreateFolderButton() {
    if (!this.canUserUploadFiles()) {
      this.notificationService.showNotification("Sorry, but you don't have the permission to create folder");
      return;
    }
    return this.openActionDialog(CreateFolderComponent)
  }

  onUploadFileButton() {
    if (!this.canUserUploadFiles()) {
      this.notificationService.showNotification("Sorry, but you don't have the permission to upload files");
      return;
    }
    return this.openActionDialog(UploadFilesComponent)
  }

  openActionDialog(component: ComponentType<any>) {
    const dialogRef = this.dialog.open(component, {
      panelClass: 'midi-dialog',
      position: {top: '10vh'},
      minWidth: '20vw',
      maxWidth: '50vw',
      data: this.currentPath
    })
    dialogRef.afterClosed().subscribe((result) => {
      result ? this.loadFiles() : ''
      ;
    });
  }

  showConfirmationDialog(data?: ConfirmationDialodData) {
    return this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'midi-dialog',
      position: {top: '10.5vh'},
      maxWidth: '370px',
      minWidth: '370px',
      height: '200px',
      data,
    });
  }

  deleteFile(file: IFile) {
    if (!this.canUserDeleteFiles()) {
      return;
    }

    this.showConfirmationDialog().afterClosed().subscribe((result: boolean) => {
        if (result) {
          const filePath = file.path
          this.dataService.deleteFile(filePath).subscribe({
            next: () => {
              this.notificationService.showNotification(`File ${file.name} was successfully deleted!`);
            },
            error: (err: HttpErrorResponse) => {
              this.notificationService.showNotification(`File ${file.name} can not be deleted, due to: ${err.message}`);
            },
            complete: () => {
              this.loadFiles()
            }
          })
        }
      }
    )
  }

  downloadFile(file: IFile) {
    const encodedFilePath = encodeURIComponent(file.path)
    window.open(`/api/download/${encodedFilePath}`, '_blank')
  }

  copyLinkToClipboard(file: IFile) {
    const currentUrl = this.router.url.split('?file=')[0];
    const queryParams = `&file=${encodeURIComponent(file.name)}`;
    const fullUrl = `${window.location.origin}/#${currentUrl}${queryParams}`;
    this.clipboard.copy(fullUrl)
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

  selectBucket(event: any) {
    if (event.value === this.activeBucket()) {
      return;
    }
    this.activeBucket.set(event.value);
    this.isLoadingFilesByBucket.set(true);
    this.router.navigate(['/home']);
    this.dataService.selectBucket(event.value).subscribe({
      next: () => {
        this.checkUserPermissions();
        this.currentPath = '';
        this.loadFiles();
      },
      error: () => {
        this.notificationService.showNotification(`Bucket selection error... 😢`, NotificationType.ERROR, NotificationAction.RELOAD_PAGE);
      },
      complete: () => {
        this.isLoadingFilesByBucket.set(false);
      },
    });
  }

  deleteFolder(folder: IFile) {
    if (!this.canUserDeleteFiles()) {
      return;
    }

    this.showConfirmationDialog({ 
      dialogText: 'This action will result in the complete deletion of all contents in this folder.',
      dialogType: DialogType.WARNING,
    }).afterClosed().subscribe((result: boolean) => {
        if (result) {
          const folderPath = folder.path;
          this.dataService.deleteFolder(folderPath).subscribe({
            next: () => {
              this.notificationService.showNotification(`The folder ${folder.name} was successfully deleted!`);
            },
            error: (err: HttpErrorResponse) => {
              this.notificationService.showNotification(`The folder ${folder.name} can not be deleted, due to: ${err.message}`);
            },
            complete: () => {
              this.loadFiles()
            }
          })
        }
      }
    )
  }
}
