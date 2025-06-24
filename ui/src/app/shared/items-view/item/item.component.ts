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

import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IFile} from "../../../models/files.model";
import {ViewComponent} from "../view/view.component";
import {FileAction} from "../../../models/common.model";


@Component({
    selector: 'app-item',
    templateUrl: './item.component.html',
    styleUrls: ['./item.component.scss'],
    standalone: false
})
export class ItemComponent {

    @Input()
    data!: IFile;

    @Input()
    disableFileDelete: boolean = true;

    @Output() invokeFileAction: EventEmitter<{ item: IFile, action: FileAction }> = new EventEmitter();

    protected readonly fileAction = FileAction;

    constructor(public viewComponent: ViewComponent) {
    }

    notifyParentOnFileAction(item: IFile, action: FileAction) {
        this.invokeFileAction.emit({item, action});
    }

}
