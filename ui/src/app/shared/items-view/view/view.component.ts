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
import {Component, ContentChildren, Output, EventEmitter, QueryList, signal} from '@angular/core';
import {ItemComponent} from "../item/item.component";
import {PresentationStyle, ISortType} from "../../../models/files.model";



@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent {

  presentationStyle = PresentationStyle;
  currentPresentationStyle = PresentationStyle.list
  currentSortType = signal<ISortType>({field: '', reverse: true})


  @ContentChildren(ItemComponent)
  items!: QueryList<ItemComponent>;

  @Output() sortType = new EventEmitter<ISortType>();

  setPresentationStyle(value: PresentationStyle) {
    this.currentPresentationStyle = value;
  }

  setSortType(value: string) {
    if (value === this.currentSortType().field) {
      this.sortType.emit({field: value, reverse: !this.currentSortType().reverse});
      this.currentSortType.set({field: value, reverse: !(this.currentSortType().reverse)});
    } else {
      this.sortType.emit({field: value, reverse: this.currentSortType().reverse});
      this.currentSortType.set({field: value, reverse: (this.currentSortType().reverse)});
    }


  }
}
