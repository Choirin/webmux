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
    this.childs = [];
  }

  changeParent(parent) {
    this.parent = parent;
  }

  appendChild(child) {
    this.childs.push(child);
  }

  removeChild(child) {
    let index = this.childs.indexOf(child);
    if (this.childs.length > 1) {
      if (this.splitDirection == SplitDirection.horizontal) {
        if (index == this.childs.length - 1) {
          this.childs[index - 1].height += child.height;
        } else {
          this.childs[index + 1].height += child.height;
        }
      } else if (this.splitDirection == SplitDirection.vertical) {
        if (index == this.childs.length - 1) {
          this.childs[index - 1].width += child.width;
        } else {
          this.childs[index + 1].width += child.width;
        }
      }
    }

    this.childs.splice(index, 1);
    if (this.parent !== null) {
      if (this.childs.length === 0) {
        this.parent.removeChild(this);
        // TODO: delete this ?
      } else if (this.childs.length === 1) {
        // container must have two or more childs
        this.parent.replaceChild(this, this.childs[0]);
        this.childs[0].changeParent(this.parent);
        // TODO: delete this ?
      }
    }
    rootContainer.reload();
  }

  replaceChild(oldChild, newChild) {
    const index = this.childs.indexOf(oldChild);
    this.childs.splice(index, 1, newChild);
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
    for (var i = 0; i < this.childs.length; i++) {
      if (this.childs[i] === child) return position;
      if (this.splitDirection == SplitDirection.vertical) {
        position[0] += this.childs[i].width;
      } else if (this.splitDirection == SplitDirection.horizontal) {
        position[1] += this.childs[i].height;
      }
    }
    console.error('cannot find position');
  }

  splitHorizontally() {
    let newMyHeight = parseInt(this.height / 2);
    let newOtherHeight = this.height - newMyHeight;

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

  splitVertically() {
    let newMyWidth = parseInt(this.width / 2);
    let newOtherWidth = this.height - newMyWidth;

    let newParent = new Container(this.parent, this.width, this.height, SplitDirection.vertical);
    let newChild = new Pane(newParent, newMyWidth, this.height);
    this.width = newOtherWidth;
    if (this.parent !== null)
      this.parent.replaceChild(this, newParent);
    this.changeParent(newParent);

    newParent.appendChild(this);
    newParent.appendChild(newChild);
    newParent.reload();
  }

  resizeChildHorizontally(child, size) {
    if (this.splitDirection !== SplitDirection.vertical) {
      if (this.parent !== null) this.parent.resizeChildHorizontally(this, size);
      return;
    }
    if (this.childs.length < 2) {
      console.error('invalid child size: ' + this.childs.length);
    }

    const index = this.childs.indexOf(child);
    if (index === this.childs.length - 1) {
      // most right pane has different direction
      if (this.childs[index - 1].width + size > 0 && 
          this.childs[index].width - size > 0) {
        this.childs[index - 1].width += size;
        this.childs[index].width -= size;
      }
    } else {
      if (this.childs[index].width + size > 0 &&
          this.childs[index + 1].width - size > 0) {
        this.childs[index].width += size;
        this.childs[index + 1].width -= size;
      }
    }

    this.reload();
  }

  resizeChildVertically(child, size) {
    if (this.splitDirection !== SplitDirection.horizontal) {
      if (this.parent !== null) this.parent.resizeChildVertically(this, size);
      return;
    }
    if (this.childs.length < 2) {
      console.error('invalid child size: ' + this.childs.length);
    }

    const index = this.childs.indexOf(child);
    if (index === this.childs.length - 1) {
      // most right pane has different direction
      if (this.childs[index - 1].height + size > 0 && 
          this.childs[index].height - size > 0) {
        this.childs[index - 1].height += size;
        this.childs[index].height -= size;
      }
    } else {
      if (this.childs[index].height + size > 0 &&
          this.childs[index + 1].height - size > 0) {
        this.childs[index].height += size;
        this.childs[index + 1].height -= size;
      }
    }

    this.reload();
  }

  reload() {
    for (var i = 0; i < this.childs.length; i++) {
      this.childs[i].reload();
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

  rootContainer = new Container(null, colCount, rowCount, null);
  let initialPane = new Pane(rootContainer, colCount, rowCount);
  rootContainer.appendChild(initialPane);
  rootContainer.reload();
}
