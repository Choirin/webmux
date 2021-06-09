const rowCount = 20;
const colCount = 20;

const SplitDirection = Object.freeze({
  'horizontal': 'horizontal',
  'vertical': 'vertical'
});

class Container {
  constructor(parent, width, height, splitDirection) {
    this.parent = parent;
    this.width = width;
    this.height = height;
    this.splitDirection = splitDirection;
    this.children = [];
  }

  changeParent(parent) {
    this.parent = parent;
  }

  appendChild(child) {
    this.children.push(child);
  }

  indexOf(child) {
    return this.children.indexOf(child);
  }

  insertChild(child, position) {
    this.children.splice(position, 0, child);
  }

  removeChild(child) {
    let index = this.children.indexOf(child);
    if (this.children.length > 1) {
      if (this.splitDirection == SplitDirection.horizontal) {
        if (index == this.children.length - 1) {
          this.children[index - 1].height += child.height;
        } else {
          this.children[index + 1].height += child.height;
        }
      } else if (this.splitDirection == SplitDirection.vertical) {
        if (index == this.children.length - 1) {
          this.children[index - 1].width += child.width;
        } else {
          this.children[index + 1].width += child.width;
        }
      }
    }

    this.children.splice(index, 1);
    if (this.parent !== null) {
      if (this.children.length === 0) {
        this.parent.removeChild(this);
        // TODO: delete this ?
      } else if (this.children.length === 1) {
        // container must have two or more children
        this.parent.replaceChild(this, this.children[0]);
        this.children[0].changeParent(this.parent);
        // TODO: delete this ?
      }
    }
    rootContainer.reload();
  }

  replaceChild(oldChild, newChild) {
    const index = this.children.indexOf(oldChild);
    this.children.splice(index, 1, newChild);
  }

  getPosition() {
    let position = [1, 1];
    if (this.parent != null) {
      position = this.parent.getChildPosition(this);
    }
    return position;
  }

  getChildPosition(child) {
    let position = this.getPosition();
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i] === child) return position;
      if (this.splitDirection == SplitDirection.vertical) {
        position[0] += this.children[i].width;
      } else if (this.splitDirection == SplitDirection.horizontal) {
        position[1] += this.children[i].height;
      }
    }
    console.error('cannot find position');
  }

  splitHorizontally() {
    let newMyHeight = parseInt(this.height / 2);
    let newOtherHeight = this.height - newMyHeight;

    if (this.parent !== null && this.parent.splitDirection == SplitDirection.horizontal) {
      let newChild = new Pane(this.parent, this.width, newOtherHeight);
      let position = this.parent.indexOf(this);
      console.info('position is ' + position);
      this.parent.insertChild(newChild, position + 1);
      this.height = newMyHeight;
      this.parent.reload();
    } else {
      let newParent = new Container(this.parent, this.width, this.height, SplitDirection.horizontal);
      let newChild = new Pane(newParent, this.width, newOtherHeight);
      this.height = newMyHeight;
      if (this.parent !== null)
        this.parent.replaceChild(this, newParent);
      this.changeParent(newParent);

      newParent.appendChild(this);
      newParent.appendChild(newChild);
      newParent.reload();
    }
  }

  splitVertically() {
    let newMyWidth = parseInt(this.width / 2);
    let newOtherWidth = this.width - newMyWidth;

    if (this.parent !== null && this.parent.splitDirection == SplitDirection.vertical) {
      let newChild = new Pane(this.parent, newOtherWidth, this.height);
      let position = this.parent.indexOf(this);
      console.info('position is ' + position);
      this.parent.insertChild(newChild, position + 1);
      this.width = newMyWidth;
      this.parent.reload();
    } else {
      let newParent = new Container(this.parent, this.width, this.height, SplitDirection.vertical);
      let newChild = new Pane(newParent, newOtherWidth, this.height);
      this.width = newMyWidth;
      if (this.parent !== null)
        this.parent.replaceChild(this, newParent);
      this.changeParent(newParent);

      newParent.appendChild(this);
      newParent.appendChild(newChild);
      newParent.reload();
    }
  }

  resizeChildHorizontally(child, size) {
    if (this.splitDirection !== SplitDirection.vertical) {
      if (this.parent !== null) this.parent.resizeChildHorizontally(this, size);
      return;
    }
    if (this.children.length < 2) {
      console.error('invalid child size: ' + this.children.length);
    }

    const index = this.children.indexOf(child);
    if (index === this.children.length - 1) {
      // most right pane has different direction
      if (this.children[index - 1].width + size > 0 &&
          this.children[index].width - size > 0) {
        this.children[index - 1].width += size;
        this.children[index].width -= size;
      }
    } else {
      if (this.children[index].width + size > 0 &&
          this.children[index + 1].width - size > 0) {
        this.children[index].width += size;
        this.children[index + 1].width -= size;
      }
    }

    rootContainer.reload();
  }

  resizeChildVertically(child, size) {
    if (this.splitDirection !== SplitDirection.horizontal) {
      if (this.parent !== null) this.parent.resizeChildVertically(this, size);
      return;
    }
    if (this.children.length < 2) {
      console.error('invalid child size: ' + this.children.length);
    }

    const index = this.children.indexOf(child);
    if (index === this.children.length - 1) {
      // most right pane has different direction
      if (this.children[index - 1].height + size > 0 &&
          this.children[index].height - size > 0) {
        this.children[index - 1].height += size;
        this.children[index].height -= size;
      }
    } else {
      if (this.children[index].height + size > 0 &&
          this.children[index + 1].height - size > 0) {
        this.children[index].height += size;
        this.children[index + 1].height -= size;
      }
    }

    rootContainer.reload();
  }

  reload() {
    // propagate its size to the children
    if (this.splitDirection === SplitDirection.horizontal) {
      let totalHeight = 0;
      for (var i = 0; i < this.children.length; i++)
        totalHeight += this.children[i].height;
      if (this.height !== totalHeight) {
        let resizeRatio = this.height / totalHeight;
        totalHeight = 0;
        for (var i = 0; i < this.children.length - 1; i++) {
          this.children[i].height = parseInt(this.children[i].height * resizeRatio);
          totalHeight += this.children[i].height;
        }
        this.children[this.children.length - 1] = this.height - totalHeight;
      }
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].width = this.width;
        this.children[i].reload();
      }
    } else if (this.splitDirection === SplitDirection.vertical) {
      let totalWidth = 0;
      for (var i = 0; i < this.children.length; i++)
        totalWidth += this.children[i].width;
      if (this.width !== totalWidth) {
        let resizeRatio = this.width / totalWidth;
        totalWidth = 0;
        for (var i = 0; i < this.children.length - 1; i++) {
          this.children[i].width = parseInt(this.children[i].width * resizeRatio);
          totalWidth += this.children[i].width;
        }
        this.children[this.children.length - 1] = this.width - totalWidth;
      }
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].height = this.height;
        this.children[i].reload();
      }
    }

    for (var i = 0; i < this.children.length; i++) {
      this.children[i].reload();
    }
  }
}

class Pane extends Container {
  constructor(parent, width, height) {
    super(parent, width, height, null);

    this.div = document.createElement('div');
    document.getElementById('container').appendChild(this.div);

    this.iframe = document.createElement('iframe');
    this.iframe.src = '/static/html/pane.html';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.cssFloat = 'relative';
    this.iframe.frameBorder = '0';
    this.div.appendChild(this.iframe);

    this.command_triggered = false;
    this.onload = this.onLoad.bind(this);
    this.onkeydown = this.onKeyDown.bind(this);
    this.iframe.addEventListener('load', this.onload, false);
  }

  remove() {
    document.getElementById('container').removeChild(this.div);
    this.parent.removeChild(this);
  }

  reload() {
    const position = this.getPosition();
    this.div.style.gridColumn = position[0] + '/' + (position[0] + this.width);
    this.div.style.gridRow = position[1] + '/' + (position[1] + this.height);
  }

  onLoad() {
    return this.iframe.contentWindow.document.addEventListener('keydown', this.onkeydown);
  }

  onKeyDown(event) {
    if (event.key === 'b' && event.ctrlKey) {
      this.command_triggered = true;
      return;
    }
    if (this.command_triggered) {
      if (event.key === '"') {
        console.info('split horizontally');
        this.splitHorizontally();
        this.command_triggered = false;
      } else if (event.key === '%') {
        console.info('split vertically');
        this.splitVertically();
        this.command_triggered = false;
      } else if (event.key === 'd') {
        console.info('remove');
        this.remove();
        rootContainer.reload();
        this.command_triggered = false;
      } else if (event.key === 'ArrowLeft') {
        console.info('left');
        this.parent.resizeChildHorizontally(this, -1);
        this.command_triggered = false;
      } else if (event.key === 'ArrowRight') {
        console.info('right');
        this.parent.resizeChildHorizontally(this, 1);
        this.command_triggered = false;
      } else if (event.key === 'ArrowUp') {
        console.info('up');
        this.parent.resizeChildVertically(this, -1);
        this.command_triggered = false;
      } else if (event.key === 'ArrowDown') {
        console.info('down');
        this.parent.resizeChildVertically(this, 1);
        this.command_triggered = false;
      }
    }
  }
}

let rootContainer = undefined;

window.onload = function () {
  var wrapper = document.getElementById('container');
  wrapper.style.display = 'grid';
  wrapper.style.gridTemplateRows = 'repeat(' + rowCount + ', ' + 100.0 / rowCount + '%)';
  wrapper.style.gridTemplateColumns = 'repeat(' + colCount + ', ' + 100.0 / colCount + '%)';

  // rootContainer = new Pane(null, colCount, rowCount);
  rootContainer = new Container(null, colCount, rowCount, null);
  let initialPane = new Pane(rootContainer, colCount, rowCount);
  rootContainer.appendChild(initialPane);
  rootContainer.reload();
}
